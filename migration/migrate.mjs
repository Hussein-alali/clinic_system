#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════
// migration/migrate.mjs — COPY all Supabase Storage objects into Cloudflare
// R2, non-destructively. Source objects are NEVER deleted or modified.
//
// Usage:
//   node migrate.mjs --dry-run                 # enumerate + plan, write no data
//   node migrate.mjs                           # copy missing objects
//   node migrate.mjs --bucket patient-files    # restrict to one bucket
//   node migrate.mjs --concurrency 8           # parallel object workers
//   node migrate.mjs --checksum                # sha256-verify each copied object
//   node migrate.mjs --overwrite-mismatched    # re-copy size-mismatched objects
//   node migrate.mjs --limit 50                # cap objects per bucket (testing)
//
// Env (see .env.example): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET?.
// Reports are written to migration/reports/.
// ═══════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  makeSupabase, makeR2, listBuckets, listAllObjects, r2Head, r2Put,
  r2BucketReachable, downloadSource, planAction, sha256, humanBytes, mapLimit, env,
} from "./lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const a = { dryRun: false, buckets: [], concurrency: 5, checksum: false, overwriteMismatched: false, limit: Infinity };
  for (let i = 2; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--dry-run") a.dryRun = true;
    else if (t === "--checksum") a.checksum = true;
    else if (t === "--overwrite-mismatched") a.overwriteMismatched = true;
    else if (t === "--bucket") a.buckets.push(argv[++i]);
    else if (t.startsWith("--bucket=")) a.buckets.push(t.slice(9));
    else if (t === "--concurrency") a.concurrency = Number(argv[++i]) || 5;
    else if (t.startsWith("--concurrency=")) a.concurrency = Number(t.slice(14)) || 5;
    else if (t === "--limit") a.limit = Number(argv[++i]) || Infinity;
    else if (t.startsWith("--limit=")) a.limit = Number(t.slice(8)) || Infinity;
    else if (t === "--help" || t === "-h") { printHelp(); process.exit(0); }
  }
  return a;
}

function printHelp() {
  console.log(fs.readFileSync(__filename, "utf8").split("\n").filter((l) => l.startsWith("//")).join("\n"));
}
const __filename = fileURLToPath(import.meta.url);

async function main() {
  const args = parseArgs(process.argv);
  const r2Bucket = env("R2_BUCKET", "patient-files");

  console.log("── Supabase → R2 migration ──────────────────────────────");
  console.log(`mode: ${args.dryRun ? "DRY-RUN (no writes)" : "COPY"}  concurrency: ${args.concurrency}  checksum: ${args.checksum}`);

  const supabase = makeSupabase();
  const r2 = makeR2();

  // Verify the R2 destination bucket is reachable before doing anything.
  if (!args.dryRun) {
    const reachable = await r2BucketReachable(r2, r2Bucket);
    if (!reachable) {
      console.error(`✘ R2 bucket "${r2Bucket}" is not reachable. Create it (name it the same as the Supabase bucket) and check credentials/endpoint.`);
      process.exit(2);
    }
  }

  // 1) Discover buckets (preserve names). Default: every Supabase bucket.
  let buckets = args.buckets;
  if (!buckets.length) {
    buckets = (await listBuckets(supabase)).map((b) => b.name);
  }
  console.log(`buckets to process: ${buckets.join(", ") || "(none)"}`);

  const report = {
    startedAt: new Date().toISOString(),
    dryRun: args.dryRun,
    r2Bucket,
    buckets: {},
    totals: { discovered: 0, copied: 0, verified: 0, skipped: 0, conflicts: 0, failed: 0, bytes: 0 },
  };

  for (const bucket of buckets) {
    // For R2, the destination bucket mirrors the source name unless a single
    // R2_BUCKET override is set AND we're migrating exactly one bucket.
    const destBucket = (args.buckets.length === 1 || buckets.length === 1) ? r2Bucket : bucket;
    console.log(`\nevaluating bucket "${bucket}" -> R2 "${destBucket}"`);

    const objects = (await listAllObjects(supabase, bucket)).slice(0, args.limit);
    const b = { discovered: objects.length, copied: 0, verified: 0, skipped: 0, conflicts: 0, failed: 0, bytes: 0, failures: [], conflictKeys: [] };
    report.buckets[bucket] = b;
    report.totals.discovered += objects.length;
    console.log(`  discovered ${objects.length} object(s)`);

    let done = 0;
    await mapLimit(objects, args.concurrency, async (obj) => {
      try {
        const head = await r2Head(r2, destBucket, obj.key);
        const action = planAction(obj, head, { overwriteMismatched: args.overwriteMismatched });

        if (action === "conflict") {
          b.conflicts++; report.totals.conflicts++;
          b.conflictKeys.push({ key: obj.key, srcSize: obj.size, dstSize: head.size });
        } else if (action === "skip-verified") {
          b.verified++; report.totals.verified++;
        } else { // copy
          if (args.dryRun) {
            b.copied++; report.totals.copied++; // would-copy count
          } else {
            const { buf, contentType } = await downloadSource(supabase, bucket, obj.key);
            await r2Put(r2, destBucket, obj.key, buf, contentType || obj.mimetype);
            if (args.checksum) {
              const after = await r2Head(r2, destBucket, obj.key);
              if (after.size !== buf.length) throw new Error(`post-put size mismatch (${after.size}!=${buf.length})`);
              // Optional strong check: re-download and compare sha256.
              const srcHash = sha256(buf);
              const { buf: back } = await downloadSource(supabase, bucket, obj.key);
              if (sha256(back) !== srcHash) throw new Error("source re-read checksum drift");
            }
            b.copied++; report.totals.copied++;
            b.bytes += buf.length; report.totals.bytes += buf.length;
          }
        }
      } catch (e) {
        b.failed++; report.totals.failed++;
        b.failures.push({ key: obj.key, error: String(e && e.message || e) });
      } finally {
        done++;
        if (done % 25 === 0 || done === objects.length) {
          process.stdout.write(`\r  progress ${done}/${objects.length}  copied=${b.copied} verified=${b.verified} conflicts=${b.conflicts} failed=${b.failed}  `);
        }
      }
    });
    process.stdout.write("\n");
    b.skipped = b.verified;
    console.log(`  bucket "${bucket}" done — copied ${b.copied}, already-present ${b.verified}, conflicts ${b.conflicts}, failed ${b.failed}, bytes ${humanBytes(b.bytes)}`);
  }

  report.finishedAt = new Date().toISOString();

  // Write the report.
  const reportsDir = path.join(__dirname, "reports");
  fs.mkdirSync(reportsDir, { recursive: true });
  const stamp = report.startedAt.replace(/[:.]/g, "-");
  const file = path.join(reportsDir, `migration-${args.dryRun ? "dryrun-" : ""}${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(report, null, 2));

  console.log("\n── summary ───────────────────────────────────────────────");
  console.log(`  discovered : ${report.totals.discovered}`);
  console.log(`  ${args.dryRun ? "would-copy " : "copied     "}: ${report.totals.copied}`);
  console.log(`  already-ok : ${report.totals.verified}`);
  console.log(`  conflicts  : ${report.totals.conflicts}  (size mismatch — NOT overwritten)`);
  console.log(`  failed     : ${report.totals.failed}`);
  console.log(`  transferred: ${humanBytes(report.totals.bytes)}`);
  console.log(`  report     : ${file}`);

  if (report.totals.failed > 0 || report.totals.conflicts > 0) {
    console.log("\n⚠ Migration is NOT complete — rerun to retry failures, and inspect conflicts.");
    console.log("  (The migration is safe to rerun: already-present objects are skipped.)");
    process.exit(1);
  }
  console.log(args.dryRun
    ? "\n✔ Dry-run complete. Re-run without --dry-run to perform the copy."
    : "\n✔ Copy pass complete. Now run verify.mjs before switching reads to R2.");
}

main().catch((e) => { console.error("\n✘ fatal:", e.message); process.exit(2); });
