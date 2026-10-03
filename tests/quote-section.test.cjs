const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const parser = require("@babel/parser");
const postcss = require("postcss");
const tailwindcss = require("tailwindcss");
const config = require("../tailwind.config.js");

const read = (file) => fs.readFileSync(path.resolve(__dirname, "..", file), "utf8");

test("the full-width quote section replaces the old subscription banner after Clients", () => {
  const home = read("pages/index.js");
  assert.ok(home.indexOf("<QuoteSection") > home.indexOf("<Testimonials"));
  assert.doesNotMatch(read("components/Testimonials.js"), /Subscribe Now|Get Started|-mb-44|blur\(114px\)/);
  assert.match(read("components/QuoteSection.js"), /w-full bg-primary-light/);
  assert.doesNotMatch(read("components/Layout/Footer.js"), /pt-44/);
  assert.match(read("components/Layout/Footer.js"), /href=\{businessPhone.telephone\}/);
});

test("the UI-only form uses a native modal with accessible labels and local image cleanup", () => {
  const source = read("components/QuoteDialog.js");
  parser.parse(source, { sourceType: "module", plugins: ["jsx"] });
  parser.parse(read("components/QuoteSection.js"), { sourceType: "module", plugins: ["jsx"] });
  assert.match(source, /<dialog\b/);
  assert.match(source, /\.showModal\(\)/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /aria-labelledby="quote-dialog-title"/);
  assert.match(source, /type="file"/);
  assert.match(source, /URL\.createObjectURL\(photo\)/);
  assert.match(source, /URL\.revokeObjectURL\(url\)/);
  assert.match(source, /Not sent\. Online submission is not connected yet\./);
  assert.match(source, /setReview\(createQuoteRequest\(values, photo\)\)/);
  assert.doesNotMatch(source, /fetch\(|XMLHttpRequest|localStorage|sessionStorage/);
});

test("Tailwind emits responsive quote, native backdrop, and semantic error/focus styles", async () => {
  const css = await postcss([
    tailwindcss({ ...config, content: [{ raw: read("components/QuoteSection.js") + read("components/QuoteDialog.js"), extension: "jsx" }] }),
  ]).process("@tailwind utilities;", { from: undefined });
  assert.match(css.css, /::backdrop/);
  assert.match(css.css, /@media \(min-width: 640px\)/);
  assert.match(css.css, /@media \(min-width: 1024px\)/);
  assert.match(css.css, /\[aria-invalid=true\]/);
  assert.match(css.css, /--tw-ring-color: rgb\(196 33 42/);
  assert.match(css.css, /background-color: rgb\(251 240 241/);
});
