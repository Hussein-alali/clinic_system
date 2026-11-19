# Cloudflare R2 storage migration

Migrating **file storage only** from Supabase Storage to Cloudflare R2. The
Supabase **PostgreSQL database, Auth, RLS, and all records stay exactly as
they are.** This document is the single source of truth for the design, the
manual setup, and the cutover/rollback procedure.

> **Status: code complete, nothing migrated yet.** No files have been copied
> to R2 and reads still use Supabase (`R2_ENABLED` is off). The migration is
> only "done" after you run the utility and `verify.mjs` exits `0`. Nothing
> in this repo claims otherwise.

---

## 1. Report — the existing Supabase Storage implementation

**Architecture reality.** The app is a **fully static SPA**: `index.html`
loads React + Babel-Standalone from a CDN and compiles `src/*.jsx` **in the
browser**. `server.js` is a ~60-line zero-dependency **static file server**
with no API routes. The browser talks **directly** to Supabase (Postgres via
PostgREST, Auth, Storage) using the **publishable/anon key** in
`src/supabase.jsx`. Security is enforced by **RLS + Storage policies** keyed on
the signed-in user's JWT and `public.app_role()`. The only pre-existing
server-side code is **Supabase Edge Functions** (`admin-create-user`,
`admin-reset-password`, `admin-set-status`) — the project's established home
for secret-holding logic.

**Why this matters for R2.** Unlike the Supabase anon key (safe in the browser
by design), **R2 S3 credentials are full-access secrets** and must never reach
the browser. Since the app has no backend, migrating to R2 *requires* a
server-side gateway. We added one as an Edge Function (`r2-storage`), matching
the project's existing trust model — no new runtime on Hosting.com.

**Storage touch-points (all centralized in `src/supabase.jsx`):**

| Function | Line (approx) | Operation |
|---|---|---|
| `uploadPatientFile(patientId, file, onProgress)` | ~2120 | upload + public URL + insert `patient_files` row (compensating rollback) |
| `listPatientFiles(patientId)` | ~2190 | DB read (no storage call) |
| `removePatientFile(fileId)` | ~2205 | delete DB row, then delete object |
| `getPatientFileUrl(row, expires)` | ~2235 | `createSignedUrl` with `file_url` fallback |
| `__uploadReceiptFile(patientId, receiptId, file)` | ~1823 | upload receipt (prefix `receipts/`) |
| `__removeReceiptFile(storage_path)` | ~1834 | delete receipt object |
| `PatientFiles` component (`src/screens1.jsx`) | ~1773 | thumbnail + open/download; previously used raw `file_url` |
| bulk import (`src/import.jsx`) | ~236 | calls `uploadPatientFile` |

**What the database stores** (unchanged by this migration):
- `patient_files`: `file_id` (PK), `patient_id`, `file_name`, `original_name`,
  `storage_path` (**relative object key**, e.g.
  `P-43298695/pf_…-WhatsApp_Image….jpeg`), `file_url` (**full Supabase public
  URL**), `file_type`/`mime_type`, `file_size`, `uploaded_by*`, `uploaded_at`.
- `payment_receipts`: same idea with `storage_path` + `file_url`, prefix
  `receipts/…` (feature coded but currently unused — 0 rows).

So the DB keeps **both** a relative key **and** a full URL. The migration
preserves keys 1:1, so `storage_path` keeps working as-is; reads resolve a
fresh signed URL from the key (we never persist signed URLs).

**Auth/authorization for file access:** Storage RLS policies grant the
`patient-files` bucket to `app_role() in ('admin','receptionist','doctor',
'therapist')`. The R2 gateway enforces the **same** check against the caller's
JWT + active `staff` row before signing anything.

---

## 2. Discovered storage buckets

Audited against both the code and the **live** project
`iwqnhajzjudmhseurwmh` (read-only):

| Bucket | Public? | Objects | Size | DB rows |
|---|---|---|---|---|
| **`patient-files`** | **private** (`public:false`) | **910** | **~3.04 GiB** (3,261,887,807 B) | 900 `patient_files`, 0 `payment_receipts` |

- **Exactly one bucket.** No other buckets exist in code or in the project.
- **10 orphan objects** (910 objects vs 900 rows) exist with no DB row — so the
  migration **enumerates storage, not the DB**, and copies every object.
- The bucket was created `public` by the migration SQL but is **private** in
  production. Stored `file_url` public URLs are therefore effectively dead for
  access; working access is via signed URLs. (The new thumbnail code resolves
  signed URLs too, fixing a latent issue.)

---

## 3. Files created and modified

**Created**
- `supabase/functions/r2-storage/index.ts` — the R2 gateway Edge Function (Deno).
- `src/services/storage/storage.service.jsx` — centralized browser `window.StorageService`.
- `src/services/storage/storage.utils.mjs` — shared pure helpers (key safety, etc.).
- `migration/` — `migrate.mjs`, `verify.mjs`, `lib.mjs`, `package.json`, `.env.example`, `README.md`, `rclone-guide.md`.
- `tests/` — `storage.utils.test.mjs`, `migration.logic.test.mjs`, `client.storageservice.test.mjs`.
- `R2_MIGRATION.md` (this file).

**Modified**
- `src/supabase.jsx` — storage functions now delegate to `StorageService` when
  R2 is enabled; otherwise unchanged Supabase-direct behavior. Also exposes
  `window.SUPABASE_URL` / `window.SUPABASE_ANON_KEY`.
- `src/screens1.jsx` — new `FileThumb` resolves signed URLs; clickability keyed
  on `storage_path || file_url`.
- `index.html` — adds the storage config block + loads `storage.service.jsx`.
- `supabase/config.toml` — registers `[functions.r2-storage] verify_jwt = false`.
- `.gitignore` — ignores `.env`, `migration/.env`, `migration/reports/`.

**No database schema or records were changed.** (`storage.path`/`file_url`
columns are reused as-is.)

---

## 4. The R2 implementation

### Gateway — `supabase/functions/r2-storage/index.ts`
A security-gated Deno Edge Function. For every request it: reads the caller's
`Authorization: Bearer <jwt>`, confirms an **active** `staff` row with an
authorized role (same set as the storage RLS), then performs the op using R2
credentials held **only** in Edge secrets. Uses `aws4fetch` to sign S3
requests to R2 (`region:auto`, `service:s3`).

| op | Purpose | Notes |
|---|---|---|
| `sign-upload` | Presigned **PUT** so the browser uploads straight to R2 | File never transits the function; 300s window; Content-Type sent by browser, preserved on the object |
| `get-url` | Presigned **GET** (default **300s**, max 3600s) | **R2 first; Supabase fallback** if the object isn't in R2 yet |
| `exists` | HEAD in R2 (+ legacy presence) | |
| `metadata` | HEAD → size/contentType/etag/lastModified | |
| `delete` | Delete the **R2** object only | Supabase copy preserved as backup |
| `copy` | Server-side copy within R2 | |

Path-traversal protection (`isSafeKey`) rejects `..`, leading `/`, backslashes,
control chars, and empty/dot segments before any key is signed.

### Client — `src/services/storage/storage.service.jsx`
The single entry point for all storage ops (`window.StorageService`): `uploadFile`,
`getUrl`, `remove`, `exists`, `getMetadata`, `copy`, `downloadBlob`. It calls
only the gateway, with the caller's JWT. **Safe by default:** every method is
inert unless `window.R2_ENABLED === true`; until then `src/supabase.jsx` keeps
its original Supabase-direct path, so merging this changes nothing in
production until you flip the flag.

---

## 5. Migration utility

See [`migration/README.md`](./migration/README.md) and
[`migration/rclone-guide.md`](./migration/rclone-guide.md).

- **COPY only** — never deletes/moves/modifies source objects (statically
  asserted by a test). Keys preserved 1:1. MIME preserved.
- Discovers all buckets, recurses all prefixes, paginates, retries with
  backoff, bounded concurrency, dry-run, progress, JSON reports.
- **No blind overwrites:** an existing R2 object with a different size is a
  *conflict* (reported, not overwritten) unless `--overwrite-mismatched`.
- Verification compares counts + sizes, and SHA-256 (full or sampled).

---

## 6. Required environment variables

**Nothing secret is stored on Hosting.com or in the browser.** The R2
credentials live only in the Edge Function.

### Supabase Edge Function secrets (the only place R2 keys live)
```
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=<r2 access key id>
R2_SECRET_ACCESS_KEY=<r2 secret access key>
R2_BUCKET=patient-files        # optional; defaults to patient-files
# SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are injected
# by the platform automatically.
```

### Migration utility (local only — see `migration/.env.example`)
```
SUPABASE_URL=https://iwqnhajzjudmhseurwmh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key>     # read-only use here
R2_ENDPOINT=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... R2_BUCKET=patient-files
```

### Frontend (Hosting.com) — no secrets
Only a non-secret flag controls the cutover, set in `index.html`:
```html
<script> window.R2_ENABLED = true; </script>
```

---

## 7. Hosting.com deployment

The frontend stays a static Node app (`npm start` → `server.js`). **No new
npm dependencies, no cPanel secret env vars, no VPS, no root** are required —
a direct benefit of keeping R2 credentials in the Edge Function.

1. Deploy the Edge Function (one-time), from any machine with the Supabase CLI:
   ```bash
   supabase functions deploy r2-storage --no-verify-jwt --project-ref iwqnhajzjudmhseurwmh
   supabase secrets set R2_ENDPOINT=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... R2_BUCKET=patient-files --project-ref iwqnhajzjudmhseurwmh
   ```
   (Or via Dashboard → Edge Functions → Deploy, paste
   `supabase/functions/r2-storage/index.ts`, turn **Verify JWT off**, then set
   the secrets under the function's settings.)
2. **R2 CORS** — allow browser PUT uploads from your app origin. In Cloudflare
   → R2 → `patient-files` → Settings → CORS policy:
   ```json
   [{ "AllowedOrigins": ["https://YOUR-APP-DOMAIN"],
      "AllowedMethods": ["PUT","GET","HEAD"],
      "AllowedHeaders": ["*"], "MaxAgeSeconds": 3600 }]
   ```
   (Presigned GETs used by `<img>`/`window.open`/download links don't need
   CORS; the PUT upload does.)
3. Deploy the frontend to Hosting.com as you do today (push → `npm install` →
   `npm start`). The static files already include the new client service.
4. Flip the flag **only after migration + verification pass** (see §8): set
   `window.R2_ENABLED = true;` in `index.html` and redeploy.

> Optional: if you prefer to drive the flag from a cPanel environment variable,
> template `index.html` at deploy time to inject
> `window.R2_ENABLED = Boolean(process.env.R2_ENABLED)`. This is **not
> required** and adds a build step; editing the one line in `index.html` is
> simpler and is the documented path.

---

## 8. Migration & verification commands

```bash
cd migration
cp .env.example .env     # fill real keys; never commit
npm install
set -a && . ./.env && set +a

node migrate.mjs --dry-run            # 1. plan only, writes nothing
node migrate.mjs --concurrency 8      # 2. copy (safe to re-run)
node verify.mjs                       # 3. size + count verification
node verify.mjs --checksum --sample 100   # 4. byte-level spot check
```

Transition strategy (production stays live throughout):
1. Keep Supabase as the file source (default; `R2_ENABLED` off).
2. Deploy the gateway + secrets + R2 CORS.
3. Run `migrate.mjs` (reads keep serving from Supabase meanwhile).
4. Run `verify.mjs` until it exits `0`.
5. *(optional)* Enable R2 for **new uploads** first by flipping `R2_ENABLED`
   on — reads already fall back to Supabase for anything not yet in R2, so
   nothing breaks.
6. For the final pass, briefly pause uploads/deletes, run one more
   `migrate.mjs` + `verify.mjs`.
7. Keep `R2_ENABLED = true`. Reads now prefer R2, fall back to Supabase for any
   gap.
8. Leave all Supabase objects in place as a backup. **No automatic cleanup.**

Do not announce success until `verify.mjs` exits `0`.

---

## 9. Test results

Unit/logic suite (runs with no network/credentials):
```
$ cd migration && npm test        # node --test ../tests/*.test.mjs
# tests 20
# pass 20
# fail 0
```
Covers: path-traversal rejection, filename/key preservation, signed-URL expiry
policy (300s default / 3600s max), migration decision logic
(missing→copy, identical→skip, size-mismatch→conflict/no-overwrite),
URL parsing, the **non-destructive invariant** (static assertion that the
migration code and rclone guide perform no source deletes/sync/move/purge),
the client service's safe-by-default flag, and the client↔utils key-safety
mirror staying in sync.

**Integration tests that require a deployed gateway + R2 credentials** (upload
image/PDF, retrieve a migrated image, generate a signed URL, download a
document, legacy Supabase fallback, R2 network-error handling, auth/authz
rejection, duplicate-upload skip) are **not run here** because no R2
credentials exist in this environment. Run them after §7/§8 using the app and
the gateway; the checklist mirrors the 12 scenarios in the request.

---

## 10. Rollback procedure

The migration is non-destructive, so rollback is immediate and lossless:

1. **Instant:** set `window.R2_ENABLED = false` (or remove the line) in
   `index.html` and redeploy. All uploads, reads, and deletes revert to
   Supabase Storage directly. Legacy files were never moved, so everything
   still resolves.
2. Files uploaded to R2 while enabled still have their `patient_files` rows
   (with `storage_path`); after rollback those specific objects live only in
   R2. If you must fully revert those too, copy them back
   (`rclone copy r2:patient-files supabase:patient-files --immutable`) before
   disabling — or simply re-enable R2.
3. The Edge Function and R2 bucket can stay deployed; with `R2_ENABLED` off
   they are never called.
4. No database or schema change needs reverting — none was made.
