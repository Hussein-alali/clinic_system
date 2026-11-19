// ═══════════════════════════════════════════════════════════════════════
// StorageService (browser) — the single, centralized entry point for all
// file-storage operations in the app. NO storage SDK calls or R2 logic
// should live anywhere else; src/supabase.jsx delegates here.
//
// It talks ONLY to the `r2-storage` Edge Function (which holds the R2
// credentials). The browser never sees an R2 access key. Uploads go
// straight to R2 via a short-lived presigned PUT; reads use short-lived
// presigned GETs (default 300s) with a transparent Supabase fallback.
//
// Safe-by-default rollout: every method is a no-op passthrough unless
// `window.R2_ENABLED === true`. While disabled, src/supabase.jsx keeps its
// original Supabase-direct behavior, so deploying this file changes nothing
// until you explicitly flip the flag in index.html. Flipping it back is the
// instant rollback.
//
// Loaded as a plain <script type="text/babel"> right after supabase.jsx, so
// it may read window.SB / window.SUPABASE_URL / window.SUPABASE_ANON_KEY.
// ═══════════════════════════════════════════════════════════════════════
(function () {
  "use strict";

  // ── config ───────────────────────────────────────────────────────────
  function cfg(name, fallback) {
    try { return (typeof window !== "undefined" && window[name] != null) ? window[name] : fallback; }
    catch { return fallback; }
  }
  function supabaseUrl() {
    return String(cfg("SUPABASE_URL", "https://iwqnhajzjudmhseurwmh.supabase.co")).replace(/\/+$/, "");
  }
  function anonKey() {
    return cfg("SUPABASE_ANON_KEY", "sb_publishable_fOuGESwDv4iQSRz0mPs2Bw_Of7zk58R");
  }
  function gatewayUrl() {
    return cfg("R2_GATEWAY_URL", `${supabaseUrl()}/functions/v1/r2-storage`);
  }
  // Master switch. Until this is true the app uses Supabase Storage directly.
  function isEnabled() { return cfg("R2_ENABLED", false) === true; }

  // ── key safety (mirror of storage.utils.mjs — keep in sync) ───────────
  function isSafeKey(key) {
    if (!key || typeof key !== "string") return false;
    if (key.length > 1024) return false;
    if (key.startsWith("/")) return false;
    if (key.includes("\\")) return false;
    for (let i = 0; i < key.length; i++) {
      const c = key.charCodeAt(i);
      if (c < 0x20 || c === 0x7f) return false;
    }
    const segs = key.split("/");
    for (const s of segs) if (s === "" || s === "." || s === "..") return false;
    return true;
  }

  async function authToken() {
    try {
      const sb = (typeof window !== "undefined" && window.SB) || null;
      if (!sb || !sb.auth) return null;
      const { data } = await sb.auth.getSession();
      return (data && data.session && data.session.access_token) || null;
    } catch { return null; }
  }

  // Call the gateway with the caller's JWT. Returns parsed JSON.
  async function call(op, payload) {
    const token = await authToken();
    if (!token) return { ok: false, error: "not_authenticated" };
    let res;
    try {
      res = await fetch(gatewayUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey(),
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(Object.assign({ op }, payload || {})),
      });
    } catch (e) {
      return { ok: false, error: "network_error", detail: String(e && e.message || e) };
    }
    let data = null;
    try { data = await res.json(); } catch { data = null; }
    if (!data) return { ok: false, error: `bad_response_${res.status}` };
    return data;
  }

  // ── operations ────────────────────────────────────────────────────────

  // Ask the gateway for a presigned PUT, then upload the file straight to R2.
  // Returns { ok, key } or { ok:false, error }. `onProgress(pct)` optional.
  async function uploadFile(key, file, opts) {
    opts = opts || {};
    if (!isSafeKey(key)) return { ok: false, error: "invalid_key" };
    const contentType = (file && file.type) || opts.contentType || "application/octet-stream";
    const signed = await call("sign-upload", { key, contentType, size: file && file.size });
    if (!signed || !signed.ok) return { ok: false, error: (signed && signed.error) || "sign_failed" };

    try {
      await putToR2(signed.url, file, contentType, opts.onProgress);
    } catch (e) {
      return { ok: false, error: "upload_failed", detail: String(e && e.message || e) };
    }
    return { ok: true, key: signed.key || key, bucket: signed.bucket };
  }

  // Raw PUT to the presigned URL. Uses XHR when a progress callback is given
  // (fetch has no upload-progress), otherwise a plain fetch.
  function putToR2(url, file, contentType, onProgress) {
    if (typeof onProgress === "function" && typeof XMLHttpRequest !== "undefined") {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", url, true);
        if (contentType) xhr.setRequestHeader("Content-Type", contentType);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) { try { onProgress(Math.round((e.loaded / e.total) * 100)); } catch {} }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`r2_put_${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error("r2_put_network"));
        xhr.send(file);
      });
    }
    return fetch(url, {
      method: "PUT",
      headers: contentType ? { "Content-Type": contentType } : undefined,
      body: file,
    }).then((r) => { if (!r.ok) throw new Error(`r2_put_${r.status}`); });
  }

  // Short-lived signed URL for viewing/downloading. R2 first, Supabase
  // fallback (handled server-side). Returns "" if nothing resolves.
  async function getUrl(key, expiresIn) {
    if (!isSafeKey(key)) return "";
    const r = await call("get-url", { key, expiresIn: expiresIn || 300 });
    return (r && r.ok && r.url) || "";
  }

  async function remove(key) {
    if (!isSafeKey(key)) return { ok: false, error: "invalid_key" };
    return call("delete", { key });
  }

  async function exists(key) {
    if (!isSafeKey(key)) return { ok: false, error: "invalid_key" };
    const r = await call("exists", { key });
    return r;
  }

  async function getMetadata(key) {
    if (!isSafeKey(key)) return { ok: false, error: "invalid_key" };
    return call("metadata", { key });
  }

  async function copy(srcKey, destKey) {
    return call("copy", { srcKey, destKey });
  }

  // Convenience: resolve a URL then fetch the bytes as a Blob (for an
  // in-app download that needs the data rather than a navigation).
  async function downloadBlob(key) {
    const url = await getUrl(key);
    if (!url) return null;
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.blob();
  }

  window.StorageService = {
    isEnabled,
    isSafeKey,
    gatewayUrl,
    uploadFile,
    getUrl,
    remove,
    exists,
    getMetadata,
    copy,
    downloadBlob,
  };
})();
