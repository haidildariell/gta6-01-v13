// Local preview server for the ISLA BRASA game tree.
// Serves game/ over HTTP so the ?shot= scenes can be captured exactly the
// way a player (or the screenshot tooling) would load them.
// Usage: node serve.ts [--port 8123]

import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "game");
const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};

function port(): number {
  const idx = process.argv.indexOf("--port");
  const raw = idx >= 0 ? process.argv[idx + 1] : process.env.PORT;
  const n = Number(raw ?? 8123);
  return Number.isFinite(n) && n > 0 ? n : 8123;
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  let rel = normalize(decodeURIComponent(url.pathname)).replace(/^[/\\]+/, "");
  if (rel === "" || rel === ".") rel = "index.html";
  const file = join(ROOT, rel);
  if (!file.startsWith(ROOT) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
    return;
  }
  res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
  res.end(readFileSync(file));
});

server.listen(port(), () => {
  console.log(`ISLA BRASA preview at http://localhost:${port()}/`);
});
