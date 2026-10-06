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

test("the connected form uses a native modal, multiple photos, upload cleanup and confirmed success", () => {
  const source = read("components/QuoteDialog.js");
  parser.parse(source, { sourceType: "module", plugins: ["jsx"] });
  parser.parse(read("components/QuoteSection.js"), { sourceType: "module", plugins: ["jsx"] });
  assert.match(source, /<dialog\b/);
  assert.match(source, /\.showModal\(\)/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /aria-labelledby="quote-dialog-title"/);
  assert.match(source, /type="file"/);
  assert.match(source, /URL\.createObjectURL\(file\)/);
  assert.match(source, /URL\.revokeObjectURL\(preview\)/);
  assert.match(source, /type="file" multiple/);
  assert.match(source, /5 MB total/);
  assert.match(source, /quoteApiRequest\("\/api\/quote-requests\/complete"/);
  assert.match(source, /setSuccess\(received\)/);
  assert.match(source, /submissionRef\.current/);
  assert.match(source, /disabled=\{pending\}/);
  assert.doesNotMatch(source, /name: "company"|WebP|Not sent|setReview|localStorage|sessionStorage/);
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
