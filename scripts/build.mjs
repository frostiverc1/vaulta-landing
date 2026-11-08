// Zero-dependency build: src/ -> dist/, filling {{NAME}} {{NAME_URL}} {{URL}} {{EMAIL}} {{DATE}}
// from site.config.json. Blocks wrapped in <!--if:url-->…<!--/if:url--> are dropped until a URL is set.
// `--strict` (used by `npm run build`) fails if url or email is missing, so a placeholder never ships.
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL("..", import.meta.url));
const src = join(here, "src");
const dist = join(here, "dist");
const TEXT = new Set([".html", ".css", ".js", ".txt", ".xml", ".json", ".svg", ""]);

export async function build({ strict = false } = {}) {
  const cfg = JSON.parse(await readFile(join(here, "site.config.json"), "utf8"));
  const url = (cfg.url || "").replace(/\/+$/, "");
  const missing = ["name", "url", "email"].filter((k) => !cfg[k]);
  if (strict && missing.length) throw new Error(`site.config.json is missing: ${missing.join(", ")}`);
  if (url && !/^https:\/\/[^/\s]+$/.test(url)) throw new Error('"url" must look like https://example.com (no path)');

  const vars = {
    NAME: cfg.name,
    NAME_URL: encodeURIComponent(cfg.name),
    URL: url,
    EMAIL: cfg.email || "hello@example.invalid",
    DATE: new Date().toISOString().slice(0, 10),
  };
  const render = (t) => t
    .replace(/<!--if:url-->\n?([\s\S]*?)<!--\/if:url-->\n?/g, url ? "$1" : "")
    .replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? vars[k] : m));

  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });
  const walk = async (rel = "") => {
    for (const e of await readdir(join(src, rel), { withFileTypes: true })) {
      const r = join(rel, e.name);
      if (e.isDirectory()) { await mkdir(join(dist, r), { recursive: true }); await walk(r); continue; }
      if (!url && (e.name === "sitemap.xml")) continue; // no absolute URLs yet
      if (TEXT.has(extname(e.name)) || e.name === "_headers") {
        await writeFile(join(dist, r), render(await readFile(join(src, r), "utf8")));
      } else await cp(join(src, r), join(dist, r));
    }
  };
  await walk();
  return { cfg, url, missing };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const { missing } = await build({ strict: process.argv.includes("--strict") });
    console.log(`built → dist/${missing.length ? `  (warning: config missing ${missing.join(", ")}; fine for dev, not for deploy)` : ""}`);
  } catch (e) { console.error(`build failed: ${e.message}`); process.exit(1); }
}
