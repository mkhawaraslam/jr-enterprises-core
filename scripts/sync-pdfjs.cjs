const fs = require("node:fs");
const path = require("node:path");

const source = path.dirname(require.resolve("pdfjs-dist/package.json"));
const target = path.join(__dirname, "../public/vendor/pdfjs");
fs.mkdirSync(target, { recursive: true });
for (const name of ["pdf.mjs", "pdf.worker.mjs"]) fs.copyFileSync(path.join(source, "build", name), path.join(target, name));
console.log("PDF.js viewer assets are ready.");
