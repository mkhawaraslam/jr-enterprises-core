import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { documentsToCsv, filterDocuments, formatAmount, formatDocumentDate, getSalesSnapshot, prototypeCustomers, prototypeDocuments, prototypeProducts } from "../data/salesPrototype.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("sample documents have unique IDs, valid customers and consistent totals", () => {
  assert.equal(new Set(prototypeDocuments.map((document) => document.id)).size, prototypeDocuments.length);
  for (const document of prototypeDocuments) {
    assert.ok(prototypeCustomers.some((customer) => customer.name === document.customer));
    assert.ok(document.items.every((item) => item.quantity > 0 && item.price > 0));
    assert.equal(document.amount, document.type === "Delivery Challan" ? null : document.items.reduce((sum, item) => sum + item.quantity * item.price, 0));
  }
});

test("period and type filters select only matching sample records", () => {
  assert.equal(filterDocuments().length, 9);
  assert.equal(filterDocuments({ period: "september" }).length, 3);
  assert.equal(filterDocuments({ period: "all" }).length, 12);
  assert.equal(filterDocuments({ type: "Invoice" }).length, 4);
  assert.equal(filterDocuments({ type: "Quotation" }).length, 3);
  assert.equal(filterDocuments({ type: "Delivery Challan" }).length, 2);
});

test("search matches IDs, customers and products without changing source data", () => {
  assert.equal(filterDocuments({ query: " inv-2026-075 " })[0].id, "INV-2026-075");
  assert.equal(filterDocuments({ query: "ATLAS TEXTILE" }).length, 1);
  assert.equal(filterDocuments({ query: "pneumatic cylinder" }).length, 2);
  assert.equal(filterDocuments({ query: "not-a-customer" }).length, 0);
  assert.equal(prototypeDocuments.length, 12);
});

test("attention status filters exclude paid and accepted records", () => {
  assert.equal(filterDocuments({ type: "Invoice", status: "Overdue" }).length, 1);
  assert.equal(filterDocuments({ type: "Quotation", status: "Open" }).length, 2);
  assert.ok(filterDocuments({ status: "Open" }).every((document) => ["Draft", "Sent"].includes(document.status) && document.type === "Quotation"));
  assert.equal(filterDocuments({ type: "Delivery Challan", status: "Ready" }).length, 1);
});

test("snapshot values are derived from the selected period instead of unrelated totals", () => {
  assert.deepEqual(getSalesSnapshot(), { invoiced: 547000, received: 241000, outstanding: 306000, invoiceCount: 4, overdueCount: 1, pendingQuotes: 2, readyDeliveries: 1 });
  assert.equal(getSalesSnapshot("september").invoiced, 493500);
  assert.equal(getSalesSnapshot("september").received, 237500);
  assert.equal(getSalesSnapshot("all").invoiced, 1040500);
});

test("sample dates and PKR formatting are locale-stable", () => {
  assert.equal(formatAmount(547000), "547,000");
  assert.equal(formatAmount(null), "-");
  assert.equal(formatDocumentDate("2026-10-05"), "05 Oct 2026");
});

test("CSV exports exactly the filtered records and escapes cells and formula prefixes", () => {
  const rows = filterDocuments({ status: "Overdue" });
  const csv = documentsToCsv(rows);
  assert.equal(csv.split("\r\n").length, 2);
  assert.match(csv, /INV-2026-074/);
  assert.doesNotMatch(csv, /INV-2026-075/);
  const escaped = documentsToCsv([{ ...rows[0], customer: '=SUM(1,2) "sample"' }]);
  assert.ok(escaped.includes('"\'=SUM(1,2) ""sample"""'));
  assert.equal(documentsToCsv([]).split("\r\n").length, 1);
});

test("prototype product images reuse intact local catalogue assets", () => {
  for (const product of prototypeProducts) {
    const asset = fs.readFileSync(path.join(root, "public", product.image));
    assert.ok(asset.length > 1000);
    assert.equal(asset.subarray(1, 4).toString(), "PNG");
  }
});
