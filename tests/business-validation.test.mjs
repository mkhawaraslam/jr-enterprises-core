import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
const source = fs.readFileSync(new URL("../utils/adminBusiness.js", import.meta.url), "utf8");
const { normalizeBusiness, validateBusiness, BUSINESS_IMAGE_LIMIT, BUSINESS_IMAGE_TOTAL_LIMIT } = await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));
const values = { name: " JR Enterprises ", ntn: "1234567-8", email: "info@example.com", phone: "+92 302 6500974", address: "Islamabad" };
const file = { name: "image.png", type: "image/png", size: 100 };

test("business validation requires NTN, logo and signature and trims document-ready company details", () => {
  assert.equal(normalizeBusiness(values).name, "JR Enterprises");
  assert.deepEqual(validateBusiness(values, { logo: file, signature: file }), {});
  const errors = validateBusiness({ ...values, ntn: "" });
  assert.ok(errors.ntn); assert.ok(errors.logo); assert.ok(errors.signature);
  assert.deepEqual(validateBusiness(values, {}, { logo: { path: "existing-logo" }, signature: { path: "existing-signature" } }), {});
  assert.equal(Object.keys(validateBusiness(null)).length, 7);
});

test("business images enforce PNG/JPG types, individual limits and a request-safe combined size", () => {
  for (const bad of [{ ...file, name: "file.svg", type: "image/svg+xml" }, { ...file, size: 0 }, { ...file, size: BUSINESS_IMAGE_LIMIT + 1 }]) assert.ok(validateBusiness(values, { logo: bad, signature: file }).logo);
  assert.ok(validateBusiness(values, { logo: { ...file, size: BUSINESS_IMAGE_LIMIT }, signature: { ...file, size: BUSINESS_IMAGE_LIMIT } }).images);
  assert.deepEqual(validateBusiness(values, { logo: { ...file, size: BUSINESS_IMAGE_LIMIT }, signature: { ...file, size: BUSINESS_IMAGE_TOTAL_LIMIT - BUSINESS_IMAGE_LIMIT } }), {});
});
