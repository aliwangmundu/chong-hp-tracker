/**
 * Rewrites dist/manifest.json for wherever the site will be hosted.
 *
 * Two jobs. Vite rewrites the URLs in the HTML it generates, but files in
 * public/ are copied verbatim — so the manifest, which Owlbear reads to find
 * everything else, gets its paths stamped here after the build. And each of
 * those paths gets `?v=<version>` appended.
 *
 * That query string is the cure for the ten-minute wait. GitHub Pages sends
 * `Cache-Control: max-age=600` on HTML and gives you no way to change it, so a
 * browser will happily serve yesterday's action.html. A new version means a new
 * URL, which cannot be in the cache, so a version bump lands immediately.
 *
 * The build lands in docs/ because that is the only subfolder GitHub Pages
 * will serve from.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const manifestPath = path.join(root, "docs", "manifest.json");

const [site, pkg] = await Promise.all([
  readFile(path.join(root, "site.config.json"), "utf8").then(JSON.parse),
  readFile(path.join(root, "package.json"), "utf8").then(JSON.parse),
]);

// Tolerate "chong-hp-tracker", "/chong-hp-tracker" or "/chong-hp-tracker/".
const trimmed = String(site.basePath ?? "/").replace(/^\/+|\/+$/g, "");
const base = trimmed === "" ? "/" : `/${trimmed}/`;
const version = String(pkg.version ?? "0.0.0");

const withBase = (p) =>
  (p.startsWith("/") ? base + p.slice(1) : p) + `?v=${version}`;

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

manifest.version = version;
manifest.icon = withBase(manifest.icon);
manifest.background_url = withBase(manifest.background_url);
manifest.action.icon = withBase(manifest.action.icon);
manifest.action.popover = withBase(manifest.action.popover);

await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

console.log(`\n  manifest.json → v${version}, base "${base}"`);
console.log(`  background_url: ${manifest.background_url}`);
console.log(`  action.popover: ${manifest.action.popover}`);
console.log(`\n  Check the panel shows v${version} once deployed.\n`);
