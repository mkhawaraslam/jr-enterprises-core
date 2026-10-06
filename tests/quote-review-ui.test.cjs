const assert = require("node:assert/strict");
const test = require("node:test");
const { parse } = require("next/dist/compiled/node-html-parser");
const { renderQuoteReviewUi } = require("./fixtures/quote-review-ui.cjs");

test("unreviewed badges appear in navigation, page and panel headings, with semantic status icons", () => {
  const html = renderQuoteReviewUi(); const doc = parse(html);
  assert.ok(doc.querySelectorAll('[aria-label="1 unreviewed quote request"]').length >= 3);
  assert.match(doc.querySelector("h1").parentNode.text, /Quote Requests1/);
  assert.match(doc.querySelector('section[aria-labelledby="quote-requests-list-heading"]').text, /Received requests1/);
  assert.match(html, /Not reviewed yet|Reviewed on|Cleanup needs to finish/);
  assert.ok(doc.querySelector('div[aria-label="Request review status"]'));
  assert.doesNotMatch(html, /Sample data|Cloudinary/i);
});

test("quote request view buttons use eye icons and retain accessible labels", () => {
  const doc = parse(renderQuoteReviewUi());
  const buttons = doc.querySelectorAll('button[title="View request"]');
  assert.equal(buttons.length, 3);
  for (const button of buttons) {
    assert.ok(button.querySelector("svg.lucide-eye"));
    assert.equal(button.querySelector("svg.lucide-arrow-right"), null);
    assert.match(button.getAttribute("aria-label"), /^View request from /);
  }
});

test("opening an unreviewed request offers explicit review and disables destructive actions", () => {
  const doc = parse(renderQuoteReviewUi({ view: "new-details" }));
  const dialog = doc.querySelector('dialog[aria-labelledby="quote-request-details-heading"]');
  const buttons = dialog.querySelectorAll("button");
  assert.ok(buttons.some((button) => button.text === "Mark Reviewed" && !button.hasAttribute("disabled")));
  assert.ok(buttons.some((button) => button.text === "Remove Photos" && button.hasAttribute("disabled")));
  assert.ok(buttons.some((button) => button.text === "Delete Request" && button.hasAttribute("disabled")));
});

test("reviewed requests offer separate photo removal, deletion and mark-as-new actions", () => {
  const doc = parse(renderQuoteReviewUi({ view: "details" }));
  const dialog = doc.querySelector('dialog[aria-labelledby="quote-request-details-heading"]');
  for (const label of ["Mark as New", "Remove Photos", "Delete Request"]) assert.ok(dialog.querySelectorAll("button").some((button) => button.text === label && !button.hasAttribute("disabled")));
  assert.ok(dialog.querySelector("img").getAttribute("class").includes("object-contain"));
});

test("destructive confirmation names Supabase Storage, warns of permanence and has Cancel", () => {
  for (const view of ["confirm", "photos-confirm"]) {
    const doc = parse(renderQuoteReviewUi({ view }));
    const dialog = doc.querySelector('dialog[aria-labelledby="quote-cleanup-heading"]');
    assert.match(dialog.text, /Supabase Storage/); assert.match(dialog.text, /cannot be undone|cannot be recovered/);
    assert.ok(dialog.querySelectorAll("button").some((button) => button.text === "Cancel"));
  }
  const pending = parse(renderQuoteReviewUi({ view: "confirm", pending: true }));
  const dialog = pending.querySelector('dialog[aria-labelledby="quote-cleanup-heading"]');
  assert.ok(dialog.querySelectorAll("button").every((button) => button.hasAttribute("disabled")));
  assert.match(dialog.text, /Removing/);
});
