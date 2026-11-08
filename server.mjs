// Zero-dependency dev server: builds src/ into dist/, rebuilds on change, serves dist/.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { watch } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "./scripts/build.mjs";

const here = fileURLToPath(new URL("./", import.meta.url));
const root = resolve(here, "dist");
const port = Number(process.env.PORT) || 5173;
const types = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".ico": "image/x-icon", ".json": "application/json",
  ".webmanifest": "application/manifest+json", ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

let { cfg } = await build();
let timer;
const rebuild = () => { clearTimeout(timer); timer = setTimeout(async () => {
  try { ({ cfg } = await build()); console.log("  rebuilt"); } catch (e) { console.error(`  build failed: ${e.message}`); }
}, 80); };
watch(join(here, "src"), { recursive: true }, rebuild);
watch(join(here, "site.config.json"), rebuild);

createServer(async (req, res) => {
  const send = (code, body, type = "text/plain") => res.writeHead(code, { "Content-Type": type, "X-Content-Type-Options": "nosniff" }).end(body);
  try {
    const urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let file = join(root, normalize(urlPath));
    if (!file.startsWith(root)) return send(403, "Forbidden");
    const s = await stat(file).catch(() => null);
    if (s?.isDirectory()) file = join(file, "index.html");
    const body = await readFile(file);
    res.writeHead(200, {
      "Content-Type": types[extname(file)] || "application/octet-stream",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    }).end(body);
  } catch {
    const page = await readFile(join(root, "404.html")).catch(() => null);
    page ? send(404, page, "text/html; charset=utf-8") : send(404, "Not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`\n  ${cfg.name} landing  →  http://localhost:${port}\n`);
});
