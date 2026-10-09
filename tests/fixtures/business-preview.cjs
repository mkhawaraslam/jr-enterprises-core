// Read-only, fictional-data visual fixture. No API, Auth bypass or cloud access.
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { renderBusinessUi } = require("./business-ui.cjs");
const cssDir = process.argv[2];
if (!cssDir) throw new Error("Pass the isolated production build CSS directory.");
const css = fs.readdirSync(cssDir).filter((name) => name.endsWith(".css")).map((name) => fs.readFileSync(path.join(cssDir, name), "utf8")).join("\n");
const views = new Map(["list", "create", "edit", "view", "delete"].map((view) => [view, renderBusinessUi({ view })]));
const logo = fs.readFileSync(path.resolve(__dirname, "../../public/assets/jr-logo.png"));
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  res.setHeader("Cache-Control", "no-store"); res.setHeader("X-Robots-Tag", "noindex, nofollow");
  if (url.pathname === "/preview.css") { res.setHeader("Content-Type", "text/css"); return res.end(css); }
  if (url.pathname === "/assets/jr-logo.png") { res.setHeader("Content-Type", "image/png"); return res.end(logo); }
  const view = url.searchParams.get("view") || "list";
  if (url.pathname !== "/" || !views.has(view)) { res.statusCode = 404; return res.end("Not found"); }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Business visual test</title><link rel="stylesheet" href="/preview.css"></head><body>' + views.get(view) + '<script>document.querySelectorAll("dialog[open]").forEach(function(d){d.close();d.showModal();});document.querySelectorAll("form").forEach(function(f){f.addEventListener("submit",function(e){e.preventDefault();});});</script></body></html>');
});
server.listen(4178, "127.0.0.1", () => console.log("Read-only business visual fixture: http://127.0.0.1:4178/ (list, create, edit, view, delete via ?view=)"));
process.on("SIGINT", () => server.close()); process.on("SIGTERM", () => server.close());
