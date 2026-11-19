# Supabase Storage → Cloudflare R2 migration tooling

Standalone utilities that **COPY** every file from Supabase Storage into
Cloudflare R2. This folder is **not** part of the deployed app — it has its
own `package.json` and dependencies so the static app stays dependency-free.

## Guarantees

- **Non-destructive.** Nothing is ever deleted, moved, or modified on the
  Supabase side. Only `list` + `download` are used against the source.
- **Keys preserved.** Destination keys equal source keys byte-for-byte, so
  `P-43298695/pf_...-....jpeg` in Supabase becomes the same key in R2.
- **No blind overwrites.** If an object already exists in R2 with a
  different size, it is reported as a *conflict* and left untouched unless
  you pass `--overwrite-mismatched`.
- **Resumable & safe to re-run.** Already-present objects are skipped.
- **MIME preserved.** Content-Type is carried from the source download.

## Setup

```bash
cd migration
cp .env.example .env            # fill in the real keys (never commit .env)
npm install
# load the env (any method); e.g. with a shell:
set -a && . ./.env && set +a
```

You need:
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase Dashboard → Project Settings → API.
- R2 endpoint + API token keys — Cloudflare → R2 → Manage API Tokens, and an
  R2 bucket named `patient-files` (same as the Supabase bucket).

## Run

```bash
# 1) Plan without writing anything:
npm run migrate:dry

# 2) Copy (safe to re-run until clean):
npm run migrate                 # or: node migrate.mjs --concurrency 8

# 3) Verify (gates the cutover; exits non-zero on any gap):
npm run verify                  # size + count
npm run verify:checksum         # full SHA-256 (downloads both sides)
node verify.mjs --checksum --sample 100   # checksum a random sample
```

Reports (JSON) are written to `migration/reports/`.

## What "complete" means

The migration is complete only when `verify.mjs` exits `0`:
- source object count == objects present in R2,
- every source object present in R2 with matching size,
- (recommended) a checksum pass passes.

Only then flip `window.R2_ENABLED = true` in `index.html`. See the root
`R2_MIGRATION.md` for the full cutover + rollback procedure.

## Prefer rclone?

See [`rclone-guide.md`](./rclone-guide.md) for an exact, copy-only rclone
configuration and commands. Use rclone *or* this utility — or rclone to copy
and `verify.mjs` to independently check.
