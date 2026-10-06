const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const postcss = require("postcss");
const tailwindcss = require("tailwindcss");
const config = require("../tailwind.config.js");

test("dashboard responsive utilities keep small breakpoints before desktop overrides", async () => {
  const source = ["SalesDashboard.js", "SalesOverview.js", "PrototypeDialog.js"].map((file) => fs.readFileSync(path.join(__dirname, "../components/Admin", file), "utf8")).join("\n");
  const result = await postcss([tailwindcss({ ...config, content: [{ raw: source, extension: "jsx" }] })]).process("@tailwind utilities;", { from: undefined });
  assert.ok(result.css.indexOf(".xs\\:grid-cols-2") >= 0);
  assert.ok(result.css.indexOf(".xs\\:grid-cols-2") < result.css.indexOf(".xl\\:grid-cols-4"));
  assert.ok(result.css.includes("grid-template-columns: repeat(4, minmax(0, 1fr))"));
  assert.ok(result.css.includes("height: 131px"));
  assert.ok(result.css.includes("::backdrop"));
  assert.ok(result.css.includes("rgb(196 33 42"));
  assert.doesNotMatch(source, /<style|style=|styled-jsx/);
});
