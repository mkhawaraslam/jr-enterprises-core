const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { parse } = require("next/dist/compiled/node-html-parser");
const { renderBusinessUi } = require("./fixtures/business-ui.cjs");

test("the real business directory has mobile cards, desktop table and accessible view/edit/delete controls", () => {
  const html = renderBusinessUi(); const doc = parse(html);
  assert.doesNotMatch(html, /Sample data|UI prototype/);
  assert.equal(doc.querySelector("h1").text, "Business");
  assert.ok(doc.querySelector('input[aria-label="Search businesses"]'));
  assert.ok(doc.querySelector("ul.md\\:hidden") || doc.querySelectorAll("ul").some((list) => list.getAttribute("class").includes("md:hidden")));
  assert.ok(doc.querySelector("table"));
  for (const label of ["View JR Enterprises", "Edit JR Enterprises", "Delete JR Enterprises"]) assert.ok(doc.querySelector(`button[aria-label="${label}"]`));
});

test("business creation requires every company field and both JPG/PNG image selectors", () => {
  const doc = parse(renderBusinessUi({ view: "create" })); const dialog = doc.querySelector('dialog[aria-labelledby="business-dialog-heading"]');
  for (const name of ["name", "ntn", "email", "phone", "address"]) assert.ok(dialog.querySelector(`[name="${name}"]`).hasAttribute("required"));
  for (const slot of ["logo", "signature"]) { const input = dialog.querySelector(`#business-${slot}`); assert.equal(input.getAttribute("type"), "file"); assert.equal(input.getAttribute("aria-required"), "true"); assert.match(input.getAttribute("accept"), /image\/png/); }
  assert.match(dialog.text, /2 MB per image and 3 MB combined/);
  assert.ok(dialog.querySelector('button[type="submit"]'));
});

test("business editing retains image previews and destructive confirmation identifies the company", () => {
  const edit = parse(renderBusinessUi({ view: "edit" })); assert.equal(edit.querySelector('input[name="ntn"]').getAttribute("value"), "1234567-8"); assert.ok(edit.querySelector('img[alt="Business logo"]'));
  const deletion = parse(renderBusinessUi({ view: "delete" })); const dialog = deletion.querySelector('dialog[aria-labelledby="business-dialog-heading"]');
  assert.match(dialog.text, /Permanently delete JR Enterprises/); assert.match(dialog.text, /Supabase Storage/); assert.match(dialog.text, /cannot be undone/);
  assert.ok(dialog.querySelector("button[autofocus]"));
  const pending = parse(renderBusinessUi({ view: "delete", pending: true })); assert.ok(pending.querySelectorAll('dialog[aria-labelledby="business-dialog-heading"] button').every((button) => button.hasAttribute("disabled")));
});

test("business styling stays in Tailwind and uses mobile-safe inputs and touch targets", () => {
  const source = ["BusinessDialog.js", "Businesses.js"].map((file) => fs.readFileSync(path.join(__dirname, "../components/Admin", file), "utf8")).join("\n");
  assert.doesNotMatch(source, /<style|style=|styled-jsx/); assert.match(source, /min-h-\[44px\]/); assert.match(source, /text-base/); assert.match(source, /object-contain/); assert.match(source, /focus:ring-primary/);
});
