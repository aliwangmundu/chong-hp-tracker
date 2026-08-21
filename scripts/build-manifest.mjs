/**
 * Rewrites dist/manifest.json for wherever the site will be hosted.
 *
 * Vite rewrites the URLs in the HTML it generates, but files in public/ are
 * copied verbatim — so the manifest, which Owlbear reads to find everything
 * else, gets its paths stamped here after the build.
 *
 * The build lands in docs/ because that is the only subfolder GitHub Pages
 * will serve from.
 *
 * The path comes from site.config.json. That is the one file to edit if you
 * rename the repo.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const manifestPath = path.join(root, "docs", "manifest.json");

const site = JSON.parse(
  await readFile(path.join(root, "site.config.json"), "utf8"),
);

// Tolerate "chong-hp-tracker", "/chong-hp-tracker" or "/chong-hp-tracker/".
const trimmed = String(site.basePath ?? "/").replace(/^\/+|\/+$/g, "");
const base = trimmed === "" ? "/" : `/${trimmed}/`;

const withBase = (p) => (p.startsWith("/") ? base + p.slice(1) : p);

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

manifest.icon = withBase(manifest.icon);
manifest.background_url = withBase(manifest.background_url);
manifest.action.icon = withBase(manifest.action.icon);
manifest.action.popover = withBase(manifest.action.popover);

await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

console.log(`manifest.json stamped for base "${base}"`);
console.log(`  background_url: ${manifest.background_url}`);
console.log(`  action.popover: ${manifest.action.popover}`);
