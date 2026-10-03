import assert from "node:assert/strict";
import test from "node:test";
import {
  createQuoteRequest,
  emptyQuoteRequest,
  MAX_QUOTE_IMAGE_SIZE,
  QUOTE_IMAGE_TYPES,
  validateQuoteImage,
  validateQuoteRequest,
} from "../utils/quoteRequest.js";
import { businessPhone } from "../data/contact.js";

const validRequest = {
  fullName: "Ayesha Khan",
  company: "Example Industries",
  phone: "+92 302 6500974",
  email: "purchasing@example.com",
  requirements: "10 pneumatic cylinders, model SC-40, 100 mm stroke.",
};

test("a quote requires a name, contact number, and product requirements", () => {
  assert.deepEqual(Object.keys(validateQuoteRequest(emptyQuoteRequest)), ["fullName", "phone", "requirements"]);
  assert.deepEqual(validateQuoteRequest(validRequest), {});
  assert.deepEqual(validateQuoteRequest({ ...validRequest, fullName: "   ", requirements: "\n  " }), {
    fullName: "Enter your full name.",
    requirements: "Add the product or specifications you need.",
  });
});

test("company, email, and a product photo are optional", () => {
  assert.deepEqual(validateQuoteRequest({ ...validRequest, company: "", email: "" }), {});
});

test("email and phone errors do not accept invalid contact details", () => {
  for (const phone of ["123", "telephone", "+92abc3026500974", "1234567890123456"]) {
    assert.ok(validateQuoteRequest({ ...validRequest, phone }).phone, phone);
  }
  for (const phone of ["0302 6500974", "+92 (302) 650-0974", "0044 1234 567890"]) {
    assert.equal(validateQuoteRequest({ ...validRequest, phone }).phone, undefined, phone);
  }
  for (const email of ["invalid", "buyer@", "buyer @example.com"]) {
    assert.ok(validateQuoteRequest({ ...validRequest, email }).email, email);
  }
});

test("photo validation accepts supported types within the size limit", () => {
  assert.equal(validateQuoteImage(null), "");
  for (const type of QUOTE_IMAGE_TYPES) {
    assert.equal(validateQuoteImage({ type, size: MAX_QUOTE_IMAGE_SIZE }), "");
  }
  assert.ok(validateQuoteImage({ type: "application/pdf", size: 100 }));
  assert.ok(validateQuoteImage({ type: "image/svg+xml", size: 100 }));
  assert.ok(validateQuoteImage({ type: "image/png", size: 0 }));
  const oversizedPhoto = { type: "image/png", size: MAX_QUOTE_IMAGE_SIZE + 1 };
  assert.ok(validateQuoteRequest(validRequest, oversizedPhoto).attachment);
});

test("the review payload trims text and retains the original attachment without changing form values", () => {
  const values = { ...validRequest, fullName: "  Ayesha Khan  ", requirements: "\n KITZ valve \n", unexpected: "ignore" };
  const attachment = { name: "product.png", type: "image/png", size: 100 };
  const request = createQuoteRequest(values, attachment);
  assert.equal(request.fullName, "Ayesha Khan");
  assert.equal(request.requirements, "KITZ valve");
  assert.equal(request.attachment, attachment);
  assert.equal(request.unexpected, undefined);
  assert.equal(values.fullName, "  Ayesha Khan  ");
});

test("telephone and WhatsApp both use the confirmed business number", () => {
  assert.equal(businessPhone.display, "+92 302 6500974");
  assert.equal(businessPhone.telephone, "tel:+923026500974");
  const url = new URL(businessPhone.whatsapp);
  assert.equal(url.origin, "https://wa.me");
  assert.equal(url.pathname, "/923026500974");
  assert.match(url.searchParams.get("text"), /industrial product/);
});
