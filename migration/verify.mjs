#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════
// migration/verify.mjs — independently verify that every Supabase object is
// present in R2 with matching size (and, with --checksum, matching SHA-256).
// Read-only on BOTH sides. Exits non-zero if anything is missing/mismatched,
// so it can gate a production cutover.
//
// Usage:
//   node verify.mjs                      # count + size verification
//   node verify.mjs --bucket patient-files
//   node verify.mjs --checksum           # full SHA-256 compare (downloads both)
//   node verify.mjs --sample 50          # checksum a random sample of N keys
// ═══════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  makeSupabase, makeR2, listBuckets, listAllObjects, r2Head,
  downloadSource, sha256, humanBytes, mapLimit, env,
} from "./lib.mjs";
import { GetObjectCommand } from "@aws-sdk/client-s3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const a = { buckets: [], checksum: false, sample: 0, concurrency: 8 };
  for (let i = 2; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--checksum") a.checksum = true;
    else if (t === "--bucket") a.buckets.push(argv[++i]);
    else if (t.startsWith("--bucket=")) a.buckets.push(t.slice(9));
    else if (t === "--sample") a.sample = Number(argv[++i]) || 0;
    else if (t.startsWith("--sample=")) a.sample = Number(t.slice(9)) || 0;
    else if (t === "--concurrency") a.concurrency = Number(argv[++i]) || 8;
  }
  return a;
}

async function r2GetBuffer(r2, bucket, key) {
  const res = await r2.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const chunks = [];
  for await (const c of res.Body) chunks.push(c);
  return Buffer.concat(chunks);
}

async function main() {
  const args = parseArgs(process.argv);
  const r2Bucket = env("R2_BUCKET", "patient-files");
  const supabase = makeSupabase();
  const r2 = makeR2();

  let buckets = args.buckets;
  if (!buckets.length) buckets = (await listBuckets(supabase)).map((b) => b.name);

  const report = {
    startedAt: new Date().toISOString(),
    mode: args.checksum ? (args.sample ? `checksum-sample(${args.sample})` : "checksum-full") : "size+count",
    buckets: {}, totals: { source: 0, matched: 0, missing: 0, mismatched: 0, checksummed: 0 },
  };

  let ok = true;
  for (const bucket of buckets) {
    const destBucket = (args.buckets.length === 1 || buckets.length === 1) ? r2Bucket : bucket;
    const objects = await listAllObjects(supabase, bucket);
    const b = { source: objects.length, matched: 0, missing: 0, mismatched: 0, checksummed: 0, missingKeys: [], mismatchedKeys: [] };
    report.buckets[bucket] = b;
    report.totals.source += objects.length;
    console.log(`\nverifying "${bucket}" -> R2 "${destBucket}" (${objects.length} source objects)`);

    // Choose which keys get a checksum.
    let checksumSet = null;
    if (args.checksum) {
      if (args.sample && args.sample < objects.length) {
        const shuffled = [...objects].sort(() => Math.random() - 0.5).slice(0, args.sample);
        checksumSet = new Set(shuffled.map((o) => o.key));
      } else {
        checksumSet = new Set(objects.map((o) => o.key));
      }
    }

    let done = 0;
    await mapLimit(objects, args.concurrency, async (obj) => {
      try {
        const head = await r2Head(r2, destBucket, obj.key);
        if (!head.exists) {
          b.missing++; report.totals.missing++; b.missingKeys.push(obj.key); ok = false;
        } else if (obj.size != null && head.size != null && Number(obj.size) !== Number(head.size)) {
          b.mismatched++; report.totals.mismatched++;
          b.mismatchedKeys.push({ key: obj.key, srcSize: obj.size, dstSize: head.size }); ok = false;
        } else if (checksumSet && checksumSet.has(obj.key)) {
          const [srcBuf, dstBuf] = await Promise.all([
            downloadSource(supabase, bucket, obj.key).then((r) => r.buf),
            r2GetBuffer(r2, destBucket, obj.key),
          ]);
          b.checksummed++; report.totals.checksummed++;
          if (sha256(srcBuf) !== sha256(dstBuf)) {
            b.mismatched++; report.totals.mismatched++;
            b.mismatchedKeys.push({ key: obj.key, reason: "checksum" }); ok = false;
          } else { b.matched++; report.totals.matched++; }
        } else {
          b.matched++; report.totals.matched++;
        }
      } catch (e) {
        b.mismatched++; report.totals.mismatched++;
        b.mismatchedKeys.push({ key: obj.key, reason: String(e && e.message || e) }); ok = false;
      } finally {
        done++;
        if (done % 25 === 0 || done === objects.length) {
          process.stdout.write(`\r  ${done}/${objects.length}  matched=${b.matched} missing=${b.missing} mismatched=${b.mismatched}  `);
        }
      }
    });
    process.stdout.write("\n");
    console.log(`  matched ${b.matched}, missing ${b.missing}, mismatched ${b.mismatched}, checksummed ${b.checksummed}`);
  }

  report.finishedAt = new Date().toISOString();
  report.verified = ok;
  const reportsDir = path.join(__dirname, "reports");
  fs.mkdirSync(reportsDir, { recursive: true });
  const file = path.join(reportsDir, `verify-${report.startedAt.replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(file, JSON.stringify(report, null, 2));

  console.log("\n── verification summary ─────────────────────────────────");
  console.log(`  source objects : ${report.totals.source}`);
  console.log(`  matched        : ${report.totals.matched}`);
  console.log(`  missing in R2  : ${report.totals.missing}`);
  console.log(`  mismatched     : ${report.totals.mismatched}`);
  console.log(`  checksummed    : ${report.totals.checksummed}`);
  console.log(`  report         : ${file}`);

  if (ok) {
    console.log("\n✔ VERIFIED — every source object is present in R2 with matching size" +
      (args.checksum ? " and checksum." : ". (Run with --checksum for byte-level assurance.)"));
    process.exit(0);
  } else {
    console.log("\n✘ NOT VERIFIED — do NOT switch reads to R2. Re-run migrate.mjs to copy the missing/mismatched objects, then verify again.");
    process.exit(1);
  }
}

main().catch((e) => { console.error("\n✘ fatal:", e.message); process.exit(2); });
