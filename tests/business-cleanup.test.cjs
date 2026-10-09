const assert = require("node:assert/strict");
const test = require("node:test");
const { cleanupBusinessAssets } = require("../scripts/cleanup-business-assets.cjs");
const { businessFixture } = require("./fixtures/business-api.cjs");

test("business cleanup is dry-run by default, skips active images and removes only due unreferenced paths", async () => {
  const f = businessFixture(); const server = f.load("lib/businesses/server.js"); const saved = await server.saveBusiness(f.service, null, f.validBusiness, { id: f.actor });
  const current = f.rows.get(saved.id).logo.path; const expired = saved.id + "/00000000-0000-4000-8000-000000000088/logo.png"; const future = saved.id + "/00000000-0000-4000-8000-000000000077/signature.png";
  for (const path of [current, expired, future]) { f.queue.set(path, { path, run_after: path === future ? "2099-01-01T00:00:00.000Z" : "2020-01-01T00:00:00.000Z" }); f.objects.set(path, f.image); }
  assert.equal((await cleanupBusinessAssets(f.service, { log() {} })).removed, 0); assert.equal(f.queue.size, 3);
  const result = await cleanupBusinessAssets(f.service, { execute: true, log() {} }); assert.equal(result.removed, 1); assert.equal(f.queue.has(expired), false); assert.equal(f.objects.has(expired), false); assert.equal(f.objects.has(current), true); assert.equal(f.queue.has(future), true);
});

test("business cleanup retains files/queue after storage failure and refuses invalid paths", async () => {
  const f = businessFixture(); const path = "00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000002/logo.png";
  f.queue.set(path, { path, run_after: "2020-01-01T00:00:00.000Z" }); f.state.removalError = true;
  await assert.rejects(cleanupBusinessAssets(f.service, { execute: true, log() {} }), /cleanup record was retained/); assert.equal(f.queue.size, 1);
  f.queue.clear(); f.queue.set("foreign/logo.png", { path: "foreign/logo.png", run_after: "2020-01-01T00:00:00.000Z" });
  await assert.rejects(cleanupBusinessAssets(f.service, { execute: true, log() {} }), /invalid business image path/);
});
