// ═══════════════════════════════════════════════════════════════════════
// Edge Function: r2-storage
//
// Purpose: a thin, security-gated gateway between the browser and
// Cloudflare R2 (S3-compatible). The browser never sees R2 credentials;
// it asks this function to sign short-lived URLs (upload / download) or to
// perform server-side object operations (delete / copy / head). This is the
// same trust model the project already uses for the admin-* functions:
//   • The caller MUST send their Supabase session JWT in
//     `Authorization: Bearer <token>`.
//   • We decode the JWT, confirm the caller is active staff (the same set
//     of roles `public.app_role()` authorizes for the patient-files bucket
//     in RLS), and only then sign/perform the requested R2 operation using
//     the R2 keys that live in this function's env — never in the browser.
//
// Reads use a LEGACY FALLBACK: if an object is not yet in R2 (migration in
// progress), we transparently return a short-lived Supabase Storage signed
// URL for the same object key, so no image/document access breaks during
// the transition. Nothing is ever deleted from Supabase here.
//
// Deploy (see also DEPLOY.md / R2_MIGRATION.md):
//   supabase functions deploy r2-storage --no-verify-jwt
//
// Required secrets (set once; NEVER shipped to the browser):
//   supabase secrets set R2_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com
//   supabase secrets set R2_ACCESS_KEY_ID=...
//   supabase secrets set R2_SECRET_ACCESS_KEY=...
//   supabase secrets set R2_BUCKET=patient-files        # optional, default below
//   # SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are
//   # injected automatically by the platform.
// ═══════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// The roles that `public.app_role()` authorizes for the patient-files
// bucket (read + write). Keep in sync with the storage RLS policies.
const STAFF_ROLES = new Set(["admin", "receptionist", "doctor", "therapist"]);

// Default legacy bucket name — preserved exactly from Supabase Storage.
const DEFAULT_BUCKET = "patient-files";

// Signed-URL expiry policy (seconds). Spec default is 300s; we clamp hard
// so a caller can never mint a long-lived link.
const DEFAULT_EXPIRES = 300;
const MAX_EXPIRES = 3600;
const UPLOAD_EXPIRES = 300; // presigned PUT window

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const R2_ENDPOINT = (Deno.env.get("R2_ENDPOINT") || "").replace(/\/+$/, "");
  const R2_ACCESS_KEY_ID = Deno.env.get("R2_ACCESS_KEY_ID");
  const R2_SECRET_ACCESS_KEY = Deno.env.get("R2_SECRET_ACCESS_KEY");
  const R2_BUCKET = Deno.env.get("R2_BUCKET") || DEFAULT_BUCKET;

  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY)
    return json({ ok: false, error: "server_misconfigured", detail: "supabase env missing" }, 500);
  if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY)
    return json({ ok: false, error: "server_misconfigured", detail: "r2 env missing" }, 500);

  // 1) Authenticate the caller and confirm they are active staff.
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ ok: false, error: "missing_token" }, 401);

  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userErr } = await anon.auth.getUser(token);
  if (userErr || !userData?.user) return json({ ok: false, error: "invalid_token" }, 401);

  const svc = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  // Role source of truth is the staff table (same as public.app_role()); an
  // inactive account has its row flipped to status<>'active' and app_role()
  // returns NULL, so we require an ACTIVE staff row.
  const { data: staffRow } = await svc
    .from("staff").select("role,status").eq("auth_uid", userData.user.id).maybeSingle();
  const callerRole =
    (staffRow && staffRow.status === "active" ? staffRow.role : null) ??
    (userData.user.app_metadata as any)?.role ??
    (userData.user.user_metadata as any)?.role ??
    null;
  if (!callerRole || !STAFF_ROLES.has(callerRole))
    return json({ ok: false, error: "forbidden" }, 403);

  // 2) Parse and dispatch.
  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }
  const op = String(body.op || "");
  const bucket = typeof body.bucket === "string" && body.bucket ? body.bucket : R2_BUCKET;

  // An R2 S3 client scoped to this request.
  const aws = new AwsClient({
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    service: "s3",
    region: "auto",
  });

  const objectUrl = (key: string) =>
    `${R2_ENDPOINT}/${encodeURIComponent(bucket)}/${encodeKey(key)}`;

  try {
    switch (op) {
      // ── Presigned PUT so the browser uploads straight to R2 ──────────
      // The file never passes through this function (keeps us well under
      // edge body limits and scales to large files). Credentials stay here.
      case "sign-upload": {
        const key = requireKey(body.key);
        const url = new URL(objectUrl(key));
        url.searchParams.set("X-Amz-Expires", String(UPLOAD_EXPIRES));
        const signed = await aws.sign(url.toString(), {
          method: "PUT",
          aws: { signQuery: true },
        });
        return json({
          ok: true,
          method: "PUT",
          url: signed.url,
          key,
          bucket,
          expiresIn: UPLOAD_EXPIRES,
          // The browser should send this Content-Type on the PUT so R2
          // records the correct MIME. It is intentionally NOT part of the
          // signed headers, so any value is accepted without a mismatch.
          contentType: typeof body.contentType === "string" ? body.contentType : null,
        });
      }

      // ── Presigned GET (R2 first, Supabase fallback) ──────────────────
      case "get-url": {
        const key = requireKey(body.key);
        const expiresIn = clampExpires(body.expiresIn);
        const head = await aws.fetch(objectUrl(key), { method: "HEAD" });
        if (head.ok) {
          const url = new URL(objectUrl(key));
          url.searchParams.set("X-Amz-Expires", String(expiresIn));
          const signed = await aws.sign(url.toString(), {
            method: "GET",
            aws: { signQuery: true },
          });
          return json({ ok: true, url: signed.url, source: "r2", expiresIn });
        }
        // Not in R2 yet → legacy Supabase signed URL for the same key.
        const fb = await supabaseSignedUrl(SUPABASE_URL, SERVICE_KEY, bucket, key, expiresIn);
        if (fb) return json({ ok: true, url: fb, source: "supabase", expiresIn });
        return json({ ok: false, error: "not_found" }, 404);
      }

      case "exists": {
        const key = requireKey(body.key);
        const head = await aws.fetch(objectUrl(key), { method: "HEAD" });
        if (head.ok) {
          return json({ ok: true, exists: true, source: "r2", ...headMeta(head) });
        }
        // Report legacy presence too, so callers can reason about fallback.
        const legacy = await supabaseObjectExists(svc, bucket, key);
        return json({ ok: true, exists: legacy, source: legacy ? "supabase" : null });
      }

      case "metadata": {
        const key = requireKey(body.key);
        const head = await aws.fetch(objectUrl(key), { method: "HEAD" });
        if (!head.ok) return json({ ok: false, error: "not_found" }, 404);
        return json({ ok: true, source: "r2", ...headMeta(head) });
      }

      // ── Delete the R2 object ONLY. The Supabase copy is preserved as a
      //    backup (project rule: never delete legacy source files). The app
      //    only ever lists/resolves keys that still have a DB row, so a
      //    user-deleted file is never resurrected via the read fallback.
      case "delete": {
        const key = requireKey(body.key);
        const del = await aws.fetch(objectUrl(key), { method: "DELETE" });
        // S3 DELETE is idempotent: 204 on success, 404 is also "gone".
        if (del.ok || del.status === 404) return json({ ok: true, key });
        return json({ ok: false, error: "delete_failed", status: del.status }, 502);
      }

      // ── Server-side copy within R2 (used by verification / re-key) ────
      case "copy": {
        const srcKey = requireKey(body.srcKey);
        const destKey = requireKey(body.destKey);
        const res = await aws.fetch(objectUrl(destKey), {
          method: "PUT",
          headers: { "x-amz-copy-source": `/${bucket}/${encodeKey(srcKey)}` },
        });
        if (res.ok) return json({ ok: true, srcKey, destKey });
        return json({ ok: false, error: "copy_failed", status: res.status }, 502);
      }

      default:
        return json({ ok: false, error: "unknown_op", detail: op }, 400);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "invalid_key") return json({ ok: false, error: "invalid_key" }, 400);
    console.error("r2-storage error", msg);
    return json({ ok: false, error: "internal_error", detail: msg }, 500);
  }
});

// ── Helpers ───────────────────────────────────────────────────────────

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// Validate and normalize an object key. Rejects path traversal and other
// unsafe shapes before any value reaches the signer. Throws "invalid_key".
function requireKey(raw: unknown): string {
  const key = typeof raw === "string" ? raw : "";
  if (!isSafeKey(key)) throw new Error("invalid_key");
  return key;
}

function isSafeKey(key: string): boolean {
  if (!key || typeof key !== "string") return false;
  if (key.length > 1024) return false;
  if (key.startsWith("/")) return false;        // must be relative
  if (key.includes("\\")) return false;         // no backslashes
  // No control chars / NUL.
  for (let i = 0; i < key.length; i++) {
    const c = key.charCodeAt(i);
    if (c < 0x20 || c === 0x7f) return false;
  }
  // No empty, "." or ".." segments (path traversal).
  const segs = key.split("/");
  for (const s of segs) {
    if (s === "" || s === "." || s === "..") return false;
  }
  return true;
}

// Percent-encode a key for a URL path while keeping the "/" separators.
function encodeKey(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}

function clampExpires(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_EXPIRES;
  return Math.min(Math.floor(n), MAX_EXPIRES);
}

function headMeta(res: Response) {
  return {
    size: Number(res.headers.get("content-length") || 0),
    contentType: res.headers.get("content-type") || null,
    etag: (res.headers.get("etag") || "").replace(/"/g, "") || null,
    lastModified: res.headers.get("last-modified") || null,
  };
}

// Ask Supabase Storage for a short-lived signed URL (legacy fallback).
async function supabaseSignedUrl(
  supabaseUrl: string, serviceKey: string, bucket: string, key: string, expiresIn: number,
): Promise<string | null> {
  try {
    const res = await fetch(
      `${supabaseUrl}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${encodeKey(key)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ expiresIn }),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const signed = data?.signedURL || data?.signedUrl;
    if (!signed) return null;
    return signed.startsWith("http") ? signed : `${supabaseUrl}/storage/v1${signed}`;
  } catch {
    return null;
  }
}

async function supabaseObjectExists(svc: any, bucket: string, key: string): Promise<boolean> {
  try {
    const slash = key.lastIndexOf("/");
    const dir = slash >= 0 ? key.slice(0, slash) : "";
    const name = slash >= 0 ? key.slice(slash + 1) : key;
    const { data, error } = await svc.storage.from(bucket).list(dir, { search: name, limit: 100 });
    if (error || !Array.isArray(data)) return false;
    return data.some((o: any) => o.name === name);
  } catch {
    return false;
  }
}
