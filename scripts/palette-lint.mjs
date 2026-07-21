// palette-lint — Constitution §10.2: every visual value derives from css/tokens.css.
// Scans main-site CSS (css/**, mobile/css/**) for hard-coded hex colors outside tokens.css.
// Exit 1 when violations exist. Sub-apps (halls/, rooms/) are out of scope (§2.1 own styling).
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SCAN_DIRS = ['css', 'mobile/css'];
const HEX = /#[0-9a-fA-F]{3,8}\b/g;

const files = [];
const walk = (p) => {
  for (const e of fs.readdirSync(p, { withFileTypes: true })) {
    const f = path.join(p, e.name);
    if (e.isDirectory()) walk(f);
    else if (e.name.endsWith('.css')) files.push(f);
  }
};
for (const d of SCAN_DIRS) walk(path.join(ROOT, d));

let violations = 0;
let fallbacks = 0;
for (const f of files) {
  if (path.basename(f) === 'tokens.css') continue;
  if (f.includes(`${path.sep}vendor${path.sep}`)) continue;
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  lines.forEach((line, i) => {
    // ponytail: strip url(...) so data-URI SVG fills don't false-positive,
    // and strip var(--x, #hex) fallbacks — duplication, but not a rogue color (counted separately)
    const cleaned = line.replace(/url\([^)]*\)/g, '');
    fallbacks += (cleaned.match(/var\(--[\w-]+\s*,\s*#[0-9a-fA-F]{3,8}\b/g) || []).length;
    const hits = (cleaned.replace(/var\(--[\w-]+\s*,\s*#[0-9a-fA-F]{3,8}\b/g, '').match(HEX)) || [];
    if (hits.length) {
      violations += hits.length;
      console.log(`${path.relative(ROOT, f)}:${i + 1}  ${hits.join(' ')}  |  ${line.trim().slice(0, 90)}`);
    }
  });
}

if (fallbacks) console.log(`\n(info: ${fallbacks} var(--token, #hex) fallback duplication(s) — not counted as violations)`);
console.log(violations
  ? `${violations} hard-coded color(s) outside tokens.css — §10.2 violation. Move to css/tokens.css or justify.`
  : 'palette clean — no rogue hard-coded colors outside tokens.css');
process.exit(violations ? 1 : 0);
