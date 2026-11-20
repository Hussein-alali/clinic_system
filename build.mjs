// ═══════════════════════════════════════════════════════════════════════
// build.mjs — precompile the in-browser JSX into a single ready-to-run
// bundle, so the browser no longer ships + runs Babel-Standalone on every
// page load (which was compiling ~900 KB of JSX live, the main cause of the
// slow first load).
//
// It transforms each src file the SAME WAY the <script type="text/babel">
// tags did (classic React.createElement; React stays a global from the CDN),
// in the SAME ORDER, and concatenates them. Identifiers are NOT minified, so
// the cross-file globals the app relies on keep their names exactly.
//
// Usage:  npm run build   (or: node build.mjs)
// Output: dist/app.min.js   — committed so cPanel (static serve) can pull it.
// Run this after any change to src/*.jsx, then commit dist/app.min.js.
// ═══════════════════════════════════════════════════════════════════════
import esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

// Must match the order of the script tags in index.html.
const FILES = [
  "src/supabase.jsx",
  "src/services/storage/storage.service.jsx",
  "src/core.jsx",
  "src/ui.jsx",
  "src/screens1.jsx",
  "src/roles.jsx",
  "src/multisession.jsx",
  "src/import.jsx",
  "src/screens2.jsx",
];

const parts = [];
for (const rel of FILES) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) throw new Error(`missing source file: ${rel}`);
  const code = fs.readFileSync(abs, "utf8");
  const out = await esbuild.transform(code, {
    loader: "jsx",
    jsx: "transform",          // React.createElement — React is a global (UMD)
    target: "es2018",
    minifyWhitespace: true,
    minifySyntax: true,
    minifyIdentifiers: false,  // keep global names so cross-file refs survive
    legalComments: "none",
    charset: "utf8",           // keep Arabic/UTF-8 literals readable (not \u escaped)
    sourcefile: rel,
  });
  parts.push(`/* ${rel} */\n${out.code}`);
}

const banner =
  "/* Kinetic clinic — precompiled bundle. DO NOT EDIT BY HAND.\n" +
  "   Regenerate with `npm run build` after editing any src/*.jsx. */\n";
// `;` between files guards against ASI surprises at the seams.
const bundle = banner + parts.join("\n;\n") + "\n";

fs.mkdirSync(path.join(root, "dist"), { recursive: true });
const outPath = path.join(root, "dist", "app.min.js");
fs.writeFileSync(outPath, bundle);
console.log(`built dist/app.min.js — ${(bundle.length / 1024).toFixed(0)} KB from ${FILES.length} files`);
