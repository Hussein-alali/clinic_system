// ═══════════════════════════════════════════════════════════════════════
// migration/lib.mjs — shared, side-effect-light helpers for the Supabase →
// Cloudflare R2 COPY migration. Node 18+ (ESM).
//
// HARD SAFETY INVARIANT: this module NEVER deletes, moves, or mutates a
// source object. It only lists + downloads from Supabase and head/put/copies
// into R2. The test-suite statically asserts no source-delete API is used.
// ═══════════════════════════════════════════════════════════════════════

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  S3Client, HeadObjectCommand, PutObjectCommand, HeadBucketCommand,
} from "@aws-sdk/client-s3";

// ── Auto-load migration/.env (zero-dependency) ───────────────────────────
// So `node migrate.mjs` just works on any OS / Node version without needing
// `set -a && . ./.env` or --env-file. Values already in the real environment
// win; .env only fills what is missing. Runs once on import.
(function loadDotEnv() {
  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const file = path.join(here, ".env");
    if (!fs.existsSync(file)) return;
    for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (key && process.env[key] === undefined) process.env[key] = val;
    }
  } catch { /* best effort — ignore a malformed .env */ }
})();

export function env(name, fallback) {
  const v = process.env[name];
  return v == null || v === "" ? fallback : v;
}

export function requireEnv(names) {
  const missing = names.filter((n) => !process.env[n]);
  if (missing.length) {
    throw new Error(`Missing required env var(s): ${missing.join(", ")}`);
  }
}

export function humanBytes(n) {
  n = Number(n) || 0;
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(i ? 1 : 0)} ${u[i]}`;
}

export function makeSupabase() {
  requireEnv(["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function makeR2() {
  requireEnv(["R2_ENDPOINT", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"]);
  return new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

// Retry wrapper with exponential backoff for transient network/5xx errors.
export async function withRetry(fn, { tries = 5, baseMs = 400, label = "op" } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (!isRetryable(e) || attempt === tries) break;
      const wait = baseMs * 2 ** (attempt - 1) + Math.floor(Math.random() * 150);
      await sleep(wait);
    }
  }
  // Rethrow the ORIGINAL error so callers can still inspect S3 metadata
  // (e.g. a 404 NotFound on HeadObject) and the error name. Wrapping it in a
  // generic Error here would strip `$metadata`/`name`, which made r2Head
  // miscount every missing object as a failure. Prefix the label for context
  // without discarding those fields.
  if (lastErr && typeof lastErr === "object") {
    try { lastErr.message = `${label} failed: ${lastErr.message}`; } catch { /* frozen */ }
    throw lastErr;
  }
  throw new Error(`${label} failed`);
}

function isRetryable(e) {
  const msg = String((e && e.message) || "").toLowerCase();
  const code = (e && (e.$metadata?.httpStatusCode || e.statusCode)) || 0;
  if (code >= 500 || code === 429) return true;
  return /timeout|econnreset|enotfound|eai_again|network|fetch failed|socket hang up/.test(msg);
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

// List every Supabase Storage bucket (names preserved verbatim).
export async function listBuckets(supabase) {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) throw new Error(`listBuckets failed: ${error.message}`);
  return (data || []).map((b) => ({ id: b.id, name: b.name, public: b.public }));
}

// Recursively enumerate all OBJECT keys in a bucket (not folder markers).
// Supabase list() returns folders as rows with id === null; we recurse into
// those. Paginated via limit/offset. Yields { key, size, mimetype, etag }.
export async function listAllObjects(supabase, bucket, { prefix = "", pageSize = 1000 } = {}) {
  const out = [];
  async function walk(dir) {
    let offset = 0;
    for (;;) {
      const { data, error } = await withRetry(
        () => supabase.storage.from(bucket).list(dir, {
          limit: pageSize, offset, sortBy: { column: "name", order: "asc" },
        }),
        { label: `list ${bucket}/${dir}` },
      );
      if (error) throw new Error(`list ${bucket}/${dir} failed: ${error.message}`);
      const rows = data || [];
      for (const row of rows) {
        const full = dir ? `${dir}/${row.name}` : row.name;
        // A folder placeholder has id === null and no metadata.
        if (row.id === null && (!row.metadata || row.metadata.size == null)) {
          await walk(full);
        } else {
          out.push({
            key: full,
            size: row.metadata?.size ?? null,
            mimetype: row.metadata?.mimetype ?? null,
            etag: (row.metadata?.eTag || "").replace(/"/g, "") || null,
            lastModified: row.updated_at || row.created_at || null,
          });
        }
      }
      if (rows.length < pageSize) break;
      offset += pageSize;
    }
  }
  await walk(prefix);
  return out;
}

// HEAD an R2 object. Returns { exists, size, contentType, etag } (never throws
// on a 404 — that is a normal "not there yet").
export async function r2Head(r2, bucket, key) {
  try {
    const res = await withRetry(
      () => r2.send(new HeadObjectCommand({ Bucket: bucket, Key: key })),
      { label: `head ${key}` },
    );
    return {
      exists: true,
      size: Number(res.ContentLength || 0),
      contentType: res.ContentType || null,
      etag: (res.ETag || "").replace(/"/g, "") || null,
    };
  } catch (e) {
    const code = e && (e.$metadata?.httpStatusCode || e.name);
    if (code === 404 || e?.name === "NotFound" || e?.name === "NoSuchKey") {
      return { exists: false };
    }
    throw e;
  }
}

export async function r2BucketReachable(r2, bucket) {
  try {
    await r2.send(new HeadBucketCommand({ Bucket: bucket }));
    return true;
  } catch {
    return false;
  }
}

// Download a source object's bytes from Supabase (service role). Returns a
// Buffer plus the content type Supabase reports. Read-only on the source.
export async function downloadSource(supabase, bucket, key) {
  const { data, error } = await withRetry(
    () => supabase.storage.from(bucket).download(key),
    { label: `download ${key}` },
  );
  if (error) throw new Error(`download ${key} failed: ${error.message}`);
  const ab = await data.arrayBuffer();
  const buf = Buffer.from(ab);
  const contentType = data.type || null;
  return { buf, contentType };
}

// PUT a buffer into R2 preserving content type. This is the only write path.
export async function r2Put(r2, bucket, key, buf, contentType) {
  await withRetry(
    () => r2.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buf,
      ContentType: contentType || "application/octet-stream",
      ContentLength: buf.length,
    })),
    { label: `put ${key}` },
  );
}

// Decide what to do with one object, given source info and current R2 state.
// Returns one of: "skip-verified" | "copy" | "conflict".
//   • not in R2            → copy
//   • in R2, same size     → skip-verified  (optionally checksum-verified)
//   • in R2, different size → conflict       (never silently overwritten)
export function planAction(src, head, { overwriteMismatched = false } = {}) {
  if (!head.exists) return "copy";
  if (src.size != null && head.size != null && Number(src.size) !== Number(head.size)) {
    return overwriteMismatched ? "copy" : "conflict";
  }
  return "skip-verified";
}

// Simple bounded-concurrency map.
export async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let i = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await worker(items[idx], idx);
    }
  });
  await Promise.all(runners);
  return results;
}
