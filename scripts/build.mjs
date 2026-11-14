// Zero-dependency build: src/ -> dist/, filling {{NAME}} {{NAME_URL}} {{URL}} {{EMAIL}} {{DATE}}
// from site.config.json. Blocks wrapped in <!--if:url-->…<!--/if:url--> are dropped until a URL is set.
// `--strict` (used by `npm run build`) fails if url or email is missing, so a placeholder never ships.
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL("..", import.meta.url));
const src = join(here, "src");
const dist = join(here, "dist");
const TEXT = new Set([".html", ".css", ".js", ".txt", ".xml", ".json", ".svg", ""]);

// Last change to a source file, from git (the build date would make every page look edited on every deploy).
// Falls back to today when the file has no history (new or uncommitted) or git is unavailable.
function lastmod(rel, today) {
  try {
    const dirty = execFileSync("git", ["status", "--porcelain", "--", join("src", rel)], { cwd: here, encoding: "utf8" }).trim();
    if (dirty) return today;
    return execFileSync("git", ["log", "-1", "--format=%cs", "--", join("src", rel)], { cwd: here, encoding: "utf8" }).trim() || today;
  } catch { return today; }
}

const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "\u2019", lsquo: "\u2018", ldquo: "\u201c", rdquo: "\u201d", mdash: "\u2014", ndash: "\u2013" };
const plain = (h) => h.replace(/<[^>]+>/g, "").replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) =>
  e[0] === "#" ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : +e.slice(1)) : (ENT[e] ?? m)).replace(/\s+/g, " ").trim();

// <!--faq-jsonld--> becomes FAQPage structured data built from the page's own <details><summary>Q</summary><p>A</p></details>
// blocks, so the markup can never disagree with what visitors read.
function faqJsonLd(html) {
  const items = [...html.matchAll(/<details>\s*<summary>([\s\S]*?)<\/summary>\s*<p>([\s\S]*?)<\/p>\s*<\/details>/g)]
    .map(([, q, a]) => ({ "@type": "Question", name: plain(q), acceptedAnswer: { "@type": "Answer", text: plain(a) } }));
  if (!items.length) throw new Error("faq-jsonld marker found but no <details> Q&A blocks");
  const json = JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: items }).replace(/</g, "\\u003c");
  return `<script type="application/ld+json">${json}</script>`;
}

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
  const render = (t, rel = "") => t
    .replace(/<!--faq-jsonld-->/g, () => faqJsonLd(t))
    .replace(/\{\{LASTMOD:([^}]+)\}\}/g, (m, f) => lastmod(f, vars.DATE))
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
        await writeFile(join(dist, r), render(await readFile(join(src, r), "utf8"), r));
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
