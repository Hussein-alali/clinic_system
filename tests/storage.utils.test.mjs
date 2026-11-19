// Unit tests for the shared storage utilities. Run: `node --test tests/`
import test from "node:test";
import assert from "node:assert/strict";
import {
  isSafeKey, requireSafeKey, sanitizeFileName, encodeKey,
  parseSupabasePublicUrl, clampExpires, compareObjects,
} from "../src/services/storage/storage.utils.mjs";

test("isSafeKey accepts real patient-file keys", () => {
  assert.ok(isSafeKey("P-43298695/pf_mrj5s3jjghqgt-WhatsApp_Image.jpeg"));
  assert.ok(isSafeKey("receipts/P-70792197/rct_abc-receipt.pdf"));
  assert.ok(isSafeKey("a/b/c/d.txt"));
});

test("isSafeKey rejects path traversal and unsafe shapes (scenario: path traversal)", () => {
  assert.equal(isSafeKey("../secret"), false);
  assert.equal(isSafeKey("P-1/../../etc/passwd"), false);
  assert.equal(isSafeKey("/leading/slash"), false);
  assert.equal(isSafeKey("a//b"), false);          // empty segment
  assert.equal(isSafeKey("a/./b"), false);          // dot segment
  assert.equal(isSafeKey("back\\slash"), false);
  assert.equal(isSafeKey("has\u0000null"), false);
  assert.equal(isSafeKey("ctrl\u0007bell"), false);
  assert.equal(isSafeKey(""), false);
  assert.equal(isSafeKey(null), false);
  assert.equal(isSafeKey("x".repeat(1025)), false);
});

test("requireSafeKey throws invalid_key on traversal", () => {
  assert.throws(() => requireSafeKey("../x"), (e) => e.code === "invalid_key");
  assert.equal(requireSafeKey("P-1/f.jpg"), "P-1/f.jpg");
});

test("sanitizeFileName matches the app's key-building rules (scenario: preserve keys)", () => {
  // Spaces/odd chars collapse to underscore; dots/hyphens kept; Arabic kept.
  assert.equal(sanitizeFileName("WhatsApp Image 2026.jpeg"), "WhatsApp_Image_2026.jpeg");
  assert.equal(sanitizeFileName("x-ray (1).pdf"), "x-ray_1_.pdf");
  assert.equal(sanitizeFileName("تقرير طبي.pdf"), "تقرير_طبي.pdf");
  assert.equal(sanitizeFileName(""), "file");
  assert.equal(sanitizeFileName("a".repeat(200)).length, 120);
});

test("encodeKey preserves slashes but encodes segments", () => {
  assert.equal(encodeKey("P-1/a b.jpg"), "P-1/a%20b.jpg");
  assert.equal(encodeKey("receipts/P-2/r c.pdf"), "receipts/P-2/r%20c.pdf");
});

test("parseSupabasePublicUrl extracts the documented bucket+key", () => {
  const url = "https://iwqnhajzjudmhseurwmh.supabase.co/storage/v1/object/public/patient-files/P-43298695/pf_mrj5s3jjghqgt-WhatsApp_Image_2026-07-13_at_2.45.23_PM.jpeg";
  const parsed = parseSupabasePublicUrl(url);
  assert.equal(parsed.bucket, "patient-files");
  assert.equal(parsed.key, "P-43298695/pf_mrj5s3jjghqgt-WhatsApp_Image_2026-07-13_at_2.45.23_PM.jpeg");
});

test("clampExpires enforces the 300s default and 3600s ceiling", () => {
  assert.equal(clampExpires(undefined), 300);
  assert.equal(clampExpires(0), 300);
  assert.equal(clampExpires(-5), 300);
  assert.equal(clampExpires(120), 120);
  assert.equal(clampExpires(99999), 3600);
});

test("compareObjects flags missing and size mismatch, passes identical", () => {
  assert.equal(compareObjects({ size: 10 }, { exists: false }).match, false);
  assert.equal(compareObjects({ size: 10 }, { exists: true, size: 11 }).match, false);
  assert.equal(compareObjects({ size: 10 }, { exists: true, size: 10 }).match, true);
  assert.equal(compareObjects({ size: 10, sha256: "a" }, { exists: true, size: 10, sha256: "b" }).match, false);
});
