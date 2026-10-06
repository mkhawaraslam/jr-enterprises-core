// Local, read-only visual fixture. No Auth bypass, API endpoints or cloud access.
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { renderQuoteReviewUi } = require("./quote-review-ui.cjs");
const cssDir = process.argv[2];
if (!cssDir) throw new Error("Pass the isolated production build's CSS directory.");
const css = fs.readdirSync(cssDir).filter((name) => name.endsWith(".css")).map((name) => fs.readFileSync(path.join(cssDir, name), "utf8")).join("\n");
const views = new Map(["list", "new-details", "details", "confirm", "photos-confirm"].map((view) => [view, renderQuoteReviewUi({ view })]));
const assets = new Set(["/assets/jr-logo.png", "/assets/product-collections/pneumatic-cylinders.png"]);
const publicDir = path.resolve(__dirname, "../../public");
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  res.setHeader("Cache-Control", "no-store"); res.setHeader("X-Robots-Tag", "noindex, nofollow");
  if (url.pathname === "/preview.css") { res.setHeader("Content-Type", "text/css"); return res.end(css); }
  if (assets.has(url.pathname)) { res.setHeader("Content-Type", "image/png"); return res.end(fs.readFileSync(path.join(publicDir, url.pathname))); }
  const view = url.searchParams.get("view") || "list";
  if (url.pathname !== "/" || !views.has(view)) { res.statusCode = 404; return res.end("Not found"); }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Quote review visual test</title><link rel="stylesheet" href="/preview.css"></head><body>' + views.get(view) + '<script>document.querySelectorAll("dialog[open]").forEach(function(dialog){dialog.close();dialog.showModal();});</script></body></html>');
});
server.listen(4177, "127.0.0.1", () => console.log("Read-only fictional-data preview: http://127.0.0.1:4177/ (list, details and confirm via ?view=)") );
process.on("SIGINT", () => server.close());
process.on("SIGTERM", () => server.close());
