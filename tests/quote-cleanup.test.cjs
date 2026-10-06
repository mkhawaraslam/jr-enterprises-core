const assert = require("node:assert/strict");
const test = require("node:test");
const { cleanupQuoteUploads } = require("../scripts/cleanup-quote-uploads.cjs");
const id = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
const now = new Date("2026-10-06T05:00:00Z");

function fixture({ storageError = false } = {}) {
  const tables = {
    quote_requests: [{ id, photos: [{ path: id + "/1.png" }], created_at: "2026-10-06T00:00:00Z", submitted_at: null }, { id: other, photos: [], created_at: "2026-10-06T00:00:00Z", submitted_at: "2026-10-06T01:00:00Z" }],
    quote_photo_cleanup: [{ request_id: id, paths: [id + "/1.png"], run_after: "2026-10-06T04:00:00Z" }, { request_id: other, paths: [other + "/1.jpg"], run_after: "2026-10-06T06:00:00Z" }],
  };
  const events = [];
  class Query {
    constructor(name) { this.name = name; this.filters = []; }
    select() { return this; } order() { return this; } limit() { return this; }
    is(key, value) { return this.eq(key, value); }
    eq(key, value) { this.filters.push((row) => row[key] === value); return this; }
    lt(key, value) { this.filters.push((row) => row[key] < value); return this; }
    lte(key, value) { this.filters.push((row) => row[key] <= value); return this; }
    delete() { this.deleting = true; return this; }
    then(resolve, reject) {
      const matches = tables[this.name].filter((row) => this.filters.every((filter) => filter(row)));
      if (this.deleting) { events.push("delete:" + this.name); tables[this.name] = tables[this.name].filter((row) => !matches.includes(row)); }
      return Promise.resolve({ data: matches, error: null }).then(resolve, reject);
    }
  }
  const client = { from: (name) => new Query(name), storage: { from: (bucket) => {
    assert.equal(bucket, "quote-request-photos");
    return { remove: async (paths) => { events.push("remove:" + paths.join(",")); return { error: storageError ? new Error("private provider error") : null }; } };
  } } };
  return { client, tables, events };
}

test("maintenance defaults to a dry run with no destructive calls", async () => {
  const f = fixture();
  assert.deepEqual(await cleanupQuoteUploads(f.client, { now, log: () => {} }), { pending: 1, queued: 1 });
  assert.equal(f.events.length, 0); assert.equal(f.tables.quote_requests.length, 2);
});

test("maintenance removes files before rows, leaves submitted requests and future queue entries intact", async () => {
  const f = fixture();
  await cleanupQuoteUploads(f.client, { now, execute: true, log: () => {} });
  assert.deepEqual(f.events, ["remove:" + id + "/1.png", "delete:quote_requests", "remove:" + id + "/1.png", "delete:quote_photo_cleanup"]);
  assert.equal(f.tables.quote_requests.length, 1); assert.equal(f.tables.quote_requests[0].id, other);
  assert.equal(f.tables.quote_photo_cleanup.length, 1); assert.equal(f.tables.quote_photo_cleanup[0].request_id, other);
});

test("maintenance retains pending and queue records when storage removal fails", async () => {
  const f = fixture({ storageError: true });
  await assert.rejects(cleanupQuoteUploads(f.client, { now, execute: true, log: () => {} }), /retained for retry/);
  assert.equal(f.tables.quote_requests.length, 2); assert.equal(f.tables.quote_photo_cleanup.length, 2);
  assert.ok(f.events.every((event) => !event.startsWith("delete:")));
});

test("maintenance refuses photo paths outside the reserved request folder", async () => {
  const f = fixture(); f.tables.quote_requests[0].photos = [{ path: "other-customer/1.png" }];
  await assert.rejects(cleanupQuoteUploads(f.client, { now, execute: true, log: () => {} }), /paths could not be verified/);
  assert.equal(f.events.length, 0);
});
