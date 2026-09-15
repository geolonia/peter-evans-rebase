// Rebuilds dist/licenses.txt from esbuild's metafile, replacing what
// `ncc build --license` used to emit. Reads the bundled inputs, resolves each
// one back to its package root, and concatenates the license texts found
// there. Consumes dist/meta.json and removes it when done.

import { readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const META = "dist/meta.json";
const OUT = "dist/licenses.txt";
const LICENSE_FILE = /^(licen[cs]e|copying)(\.|$)/i;

/**
 * Resolve a bundled input path to the directory of the package that owns it.
 * pnpm inputs look like
 * `node_modules/.pnpm/@actions+core@3.0.1/node_modules/@actions/core/lib/core.js`,
 * so the owning package always follows the last `node_modules/` segment.
 */
function packageRoot(input) {
  const marker = "node_modules/";
  const at = input.lastIndexOf(marker);
  if (at === -1) return null;

  const rest = input.slice(at + marker.length).split("/");
  const depth = rest[0].startsWith("@") ? 2 : 1;
  if (rest.length <= depth) return null;

  return input.slice(0, at + marker.length) + rest.slice(0, depth).join("/");
}

function licenseText(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return null;
  }

  const texts = entries
    .filter((name) => LICENSE_FILE.test(name))
    .sort()
    .map((name) => readFileSync(join(dir, name), "utf8").trim())
    .filter(Boolean);

  return texts.length ? texts.join("\n\n") : null;
}

function manifest(dir) {
  try {
    return JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  } catch {
    return null;
  }
}

const meta = JSON.parse(readFileSync(META, "utf8"));

const roots = new Set();
for (const input of Object.keys(meta.inputs)) {
  const root = packageRoot(input);
  if (root) roots.add(root);
}

// Keyed by name and version, not name alone: a bundle can carry two majors of
// the same package -- @actions/http-client 3 and 4 both ship in this one -- and
// their license texts are not guaranteed to match.
const packages = new Map();
for (const root of roots) {
  const pkg = manifest(root);
  if (!pkg?.name) continue;

  const version = typeof pkg.version === "string" ? pkg.version : "";
  const key = version ? `${pkg.name}@${version}` : pkg.name;

  // One version can still resolve to several paths; keep the first that
  // carries a license text so the output stays stable.
  if (packages.get(key)?.text) continue;

  packages.set(key, {
    label: key,
    license: typeof pkg.license === "string" ? pkg.license : "",
    text: licenseText(root),
  });
}

const missing = [];
const sections = [];
for (const [, pkg] of [...packages].sort(([a], [b]) => (a < b ? -1 : 1))) {
  if (!pkg.text) {
    missing.push(pkg.license ? `${pkg.label} (${pkg.license})` : pkg.label);
    continue;
  }
  sections.push(`${pkg.label}\n${pkg.license}\n${pkg.text}\n`);
}

if (!sections.length) {
  console.error(`${OUT}: no license texts found in ${META}`);
  process.exit(1);
}

writeFileSync(OUT, sections.join("\n"));
rmSync(META);

console.log(`${OUT}: ${sections.length} packages`);
if (missing.length) {
  console.warn(`no license file bundled for: ${missing.join(", ")}`);
}
