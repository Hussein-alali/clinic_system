# Rclone migration guide (alternative to the Node utility)

Rclone is a reliable, well-tested way to copy many objects between
S3-compatible stores. Use it **instead of** `migrate.mjs` if you prefer a
battle-tested CLI, or **in addition** as an independent cross-check.

> **SAFETY — read first.** Only ever use `rclone copy` / `rclone check`.
> **Never** run `rclone sync`, `rclone move`, `rclone delete`, or
> `rclone purge` against either remote — those can delete data. This guide
> uses copy-only commands and `--immutable` so existing destination objects
> are never overwritten.

## 1. Prerequisites

- Supabase exposes an **S3-compatible endpoint** for Storage. Create S3
  access keys in: **Supabase Dashboard → Project Settings → Storage → S3
  access keys** (note the endpoint, region `auto` or the shown region, and
  the access key / secret). The endpoint looks like
  `https://iwqnhajzjudmhseurwmh.storage.supabase.co/storage/v1/s3`.
- Create a **Cloudflare R2 bucket** named exactly `patient-files` and an R2
  **API token** with Object Read & Write. Note the S3 endpoint
  `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.
- Install rclone ≥ v1.66 (`curl https://rclone.org/install.sh | sudo bash`,
  or your package manager).

## 2. Configure the two remotes

Create `~/.config/rclone/rclone.conf` (or run `rclone config`). Do **not**
commit this file.

```ini
[supabase]
type = s3
provider = Other
access_key_id = <SUPABASE_S3_ACCESS_KEY>
secret_access_key = <SUPABASE_S3_SECRET>
endpoint = https://iwqnhajzjudmhseurwmh.storage.supabase.co/storage/v1/s3
region = <region shown in dashboard, e.g. eu-north-1>
# Supabase S3 needs path-style addressing:
force_path_style = true

[r2]
type = s3
provider = Cloudflare
access_key_id = <R2_ACCESS_KEY_ID>
secret_access_key = <R2_SECRET_ACCESS_KEY>
endpoint = https://<ACCOUNT_ID>.r2.cloudflarestorage.com
region = auto
```

## 3. Dry-run first (writes nothing)

```bash
rclone copy supabase:patient-files r2:patient-files \
  --dry-run --progress --checkers 8 --transfers 8
```

Review the planned transfers. Confirm the object keys are preserved exactly
(e.g. `P-70792197/pf_...-....jpg`).

## 4. Copy (non-destructive, no overwrites)

```bash
rclone copy supabase:patient-files r2:patient-files \
  --progress \
  --immutable \                # fail rather than overwrite a changed object
  --checksum \                 # compare by checksum/size, skip identical
  --transfers 8 --checkers 8 \
  --retries 5 --low-level-retries 10 \
  --log-file=rclone-migrate.log --log-level INFO
```

- `copy` only **adds** to the destination; it never deletes from either side.
- `--immutable` makes rclone error if a source object differs from an
  existing destination object, instead of overwriting it.
- Safe to re-run: already-copied objects are skipped.

Repeat per bucket if you have more than one (substitute the bucket name on
**both** sides so names are preserved).

## 5. Verify

```bash
# One-way check: every source object exists in the destination, identical.
rclone check supabase:patient-files r2:patient-files \
  --one-way --checksum --log-file=rclone-verify.log

# Count objects on each side (should match for the migrated set).
rclone size supabase:patient-files
rclone size r2:patient-files
```

`rclone check --one-way` exits non-zero if anything is missing or differs.
Do **not** switch production reads to R2 until it passes.

## 6. After cutover

Leave the Supabase objects in place as a backup. Do **not** run any
delete/sync/purge command. If you ever decide to reclaim Supabase storage,
do it manually and deliberately, long after R2 has been proven in
production — that step is intentionally **not** automated here.
