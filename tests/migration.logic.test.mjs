// Tests for the migration decision logic + the non-destructive invariant.
// These run without network/credentials. Run: `node --test tests/`
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { planAction } from "../migration/lib.mjs";

const root = path.dirname(fileURLToPath(import.meta.url)) + "/..";

test("planAction: missing in R2 => copy (scenario: handle missing R2 objects)", () => {
  assert.equal(planAction({ size: 100 }, { exists: false }), "copy");
});

test("planAction: present with same size => skip (scenario: duplicate upload / re-run safe)", () => {
  assert.equal(planAction({ size: 100 }, { exists: true, size: 100 }), "skip-verified");
});

test("planAction: present with different size => conflict, never overwrite", () => {
  assert.equal(planAction({ size: 100 }, { exists: true, size: 200 }), "conflict");
  // ...unless explicitly allowed:
  assert.equal(planAction({ size: 100 }, { exists: true, size: 200 }, { overwriteMismatched: true }), "copy");
});

test("planAction: unknown source size, object present => treated as present", () => {
  assert.equal(planAction({ size: null }, { exists: true, size: 123 }), "skip-verified");
});

// ── Non-destructive invariant (scenario: migration never deletes source) ──
// Static guard: the migration code must not invoke any delete/move/purge
// operation against the SOURCE (Supabase) or use destructive S3 delete
// commands. We scan the source text for forbidden API usage.
test("migration code performs no destructive source operations", () => {
  const files = ["migration/lib.mjs", "migration/migrate.mjs", "migration/verify.mjs"]
    .map((f) => fs.readFileSync(path.join(root, f), "utf8"));
  const joined = files.join("\n");

  // No Supabase storage deletion / move on the source.
  assert.equal(/\.storage\s*\.\s*from\([^)]*\)\s*\.\s*(remove|move|copy)\s*\(/.test(joined), false,
    "must not call supabase storage remove/move/copy");
  assert.equal(/\.removeBucket\s*\(|\.emptyBucket\s*\(|\.deleteBucket\s*\(/.test(joined), false,
    "must not delete/empty buckets");

  // No destructive S3 commands anywhere in the migration tooling.
  for (const bad of ["DeleteObjectCommand", "DeleteObjectsCommand", "DeleteBucketCommand"]) {
    assert.equal(joined.includes(bad), false, `must not import/use ${bad}`);
  }
  // No shelling out to destructive rclone/aws subcommands.
  assert.equal(/rclone\s+(sync|delete|purge|move)/.test(joined), false, "must not run destructive rclone");
});

test("rclone guide forbids destructive commands and uses copy-only", () => {
  const guide = fs.readFileSync(path.join(root, "migration/rclone-guide.md"), "utf8");
  assert.ok(guide.includes("rclone copy"), "guide should use rclone copy");
  assert.ok(/never[\s\S]*sync[\s\S]*move[\s\S]*delete[\s\S]*purge/i.test(guide) || guide.includes("Never"),
    "guide should warn against destructive commands");
  // The only sync/move/delete/purge mentions must be in warnings, not as
  // runnable fenced commands. Assert there is no "$ rclone sync" style command.
  assert.equal(/\n\s*rclone\s+(sync|move|delete|purge)\b/.test(guide), false);
});
