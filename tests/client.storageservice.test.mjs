// Loads the browser StorageService in a sandbox (fake window) and checks its
// behavior without a real browser: the safe-by-default flag, the key-safety
// mirror staying in sync with storage.utils, and that unsafe keys are
// refused before any network call. Run: `node --test tests/`
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { isSafeKey as utilIsSafeKey } from "../src/services/storage/storage.utils.mjs";

const root = path.dirname(fileURLToPath(import.meta.url)) + "/..";

function loadStorageService(windowOverrides = {}) {
  const src = fs.readFileSync(path.join(root, "src/services/storage/storage.service.jsx"), "utf8");
  const win = Object.assign({}, windowOverrides);
  const sandbox = { window: win, fetch: async () => { throw new Error("network should not be called in this test"); }, XMLHttpRequest: undefined, console };
  sandbox.window.fetch = sandbox.fetch;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: "storage.service.jsx" });
  return sandbox.window.StorageService;
}

test("StorageService is disabled by default (safe rollout)", () => {
  const svc = loadStorageService();
  assert.equal(svc.isEnabled(), false);
});

test("StorageService.isEnabled reflects window.R2_ENABLED strictly === true", () => {
  assert.equal(loadStorageService({ R2_ENABLED: true }).isEnabled(), true);
  assert.equal(loadStorageService({ R2_ENABLED: "yes" }).isEnabled(), false);
  assert.equal(loadStorageService({ R2_ENABLED: 1 }).isEnabled(), false);
});

test("client isSafeKey mirror matches storage.utils for a battery of cases", () => {
  const svc = loadStorageService();
  const cases = [
    "P-43298695/pf_x-WhatsApp.jpeg", "receipts/P-1/r.pdf", "a/b/c.txt",
    "../escape", "/lead", "a//b", "a/./b", "x\\y", "has\u0000nul", "", "ok.txt",
    "تقرير/ملف.pdf", "x".repeat(1025),
  ];
  for (const k of cases) {
    assert.equal(svc.isSafeKey(k), utilIsSafeKey(k), `mismatch for key: ${JSON.stringify(k)}`);
  }
});

test("gatewayUrl derives from SUPABASE_URL by default and honors override", () => {
  const def = loadStorageService({ SUPABASE_URL: "https://proj.supabase.co" });
  assert.equal(def.gatewayUrl(), "https://proj.supabase.co/functions/v1/r2-storage");
  const over = loadStorageService({ R2_GATEWAY_URL: "https://x.functions.supabase.co/r2-storage" });
  assert.equal(over.gatewayUrl(), "https://x.functions.supabase.co/r2-storage");
});

test("uploadFile refuses an unsafe key without touching the network", async () => {
  const svc = loadStorageService({ R2_ENABLED: true });
  const res = await svc.uploadFile("../evil", { type: "image/png", size: 10 });
  assert.equal(res.ok, false);
  assert.equal(res.error, "invalid_key");
});

test("getUrl returns empty string for an unsafe key (no throw)", async () => {
  const svc = loadStorageService({ R2_ENABLED: true });
  assert.equal(await svc.getUrl("../evil"), "");
});
