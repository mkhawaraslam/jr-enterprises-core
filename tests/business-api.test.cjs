const assert = require("node:assert/strict");
const test = require("node:test");
const { businessFixture, request, response } = require("./fixtures/business-api.cjs");

async function create(f) { return f.load("lib/businesses/server.js").saveBusiness(f.service, null, f.validBusiness, { id: f.actor }); }

test("creating a business validates all fields, stores both private images and records the verified actor", async () => {
  const f = businessFixture(); const handler = f.load("pages/api/admin/businesses/index.js").default; const res = response();
  await handler(request({ ...f.validBusiness, created_by: "forged", id: "forged" }), res);
  assert.equal(res.code, 201); const row = f.rows.get(res.body.id);
  assert.equal(row.created_by, f.actor); assert.equal(row.ntn, "1234567-8"); assert.equal(row.revision, 1);
  assert.equal(f.objects.size, 2); assert.equal(f.queue.size, 0);
  assert.deepEqual(f.state.events.slice(0, 4), ["reserve", "upload", "upload", "save"]);
  assert.ok(f.state.uploads.every((entry) => entry.file.startsWith(row.id + "/") && entry.options.upsert === false));
  assert.match(res.headers.get("cache-control"), /private.*no-store/); assert.equal(res.headers.get("x-robots-tag"), "noindex, nofollow");
  assert.doesNotMatch(JSON.stringify(res.body), /secret|content|created_by|token/);
});

test("missing NTN/logo/signature, invalid contact fields and forged files fail before any write", async () => {
  for (const change of [{ ntn: "" }, { email: "wrong" }, { phone: "123" }, { images: {} }, { images: { logo: null, signature: null } }, { images: { logo: { name: "file.svg", type: "image/svg+xml", size: 10 }, signature: null } }, { images: { ...businessFixture().validBusiness.images, logo: { ...businessFixture().photo, content: "Zm9yZ2Vk" } } }]) {
    const f = businessFixture(); const res = response(); await f.load("pages/api/admin/businesses/index.js").default(request({ ...f.validBusiness, ...change }), res);
    assert.equal(res.code, 422); assert.equal(f.rows.size, 0); assert.equal(f.queue.size, 0); assert.equal(f.objects.size, 0);
  }
});

test("business routes require fresh authentication, same-origin JSON and supported methods without role gates", async () => {
  const f = businessFixture({ authenticated: false }); const index = f.load("pages/api/admin/businesses/index.js").default;
  for (const method of ["GET", "POST"]) { const res = response(); await index(request(f.validBusiness, method), res); assert.equal(res.code, 401); }
  assert.equal(f.state.serviceClients, 0);
  const a = businessFixture(); const handler = a.load("pages/api/admin/businesses/index.js").default;
  for (const [req, status] of [[{ ...request(a.validBusiness), headers: { ...request().headers, origin: "https://attacker.example" } }, 403], [{ ...request(a.validBusiness), headers: { ...request().headers, "content-type": "text/plain" } }, 415], [request({}, "PUT"), 405]]) {
    const res = response(); await handler(req, res); assert.equal(res.code, status); assert.equal(a.rows.size, 0);
  }
  const missing = businessFixture({ configured: false }); const res = response(); await missing.load("pages/api/admin/businesses/index.js").default(request(missing.validBusiness), res); assert.equal(res.code, 503);
  assert.doesNotMatch(JSON.stringify(res.body), /sb_secret_|private storage|private database/);
});

test("listing searches all business details, paginates and signs previews without using a privileged client", async () => {
  const f = businessFixture(); const saved = await create(f); f.state.serviceClients = 0;
  const handler = f.load("pages/api/admin/businesses/index.js").default; const res = response(); await handler(request(null, "GET", { search: "1234567", page: "1" }), res);
  assert.equal(res.code, 200); assert.equal(res.body.count, 1); assert.ok(res.body.items[0].logo.url); assert.equal(f.state.serviceClients, 0);
  const detail = response(); await f.load("pages/api/admin/businesses/[id].js").default(request(null, "GET", { id: saved.id }), detail); assert.equal(detail.code, 200); assert.ok(detail.body.signature.url);
  const invalid = response(); await handler(request(null, "GET", { page: "0" }), invalid); assert.equal(invalid.code, 400);
});

test("editing retains unchanged images, replaces new images only after save and refuses stale revisions", async () => {
  const f = businessFixture(); const saved = await create(f); const server = f.load("lib/businesses/server.js"); const old = { ...f.rows.get(saved.id) };
  f.state.events = []; await server.saveBusiness(f.service, saved.id, { ...f.validBusiness, name: "Edited Business", images: { logo: f.photo }, revision: 1 }, { id: f.actor });
  const updated = f.rows.get(saved.id); assert.equal(updated.name, "Edited Business"); assert.equal(updated.revision, 2); assert.equal(updated.signature.path, old.signature.path); assert.notEqual(updated.logo.path, old.logo.path);
  assert.equal(f.objects.has(old.logo.path), false); assert.equal(f.objects.has(updated.signature.path), true); assert.ok(f.state.events.indexOf("save") < f.state.events.indexOf("remove"));
  await assert.rejects(server.saveBusiness(f.service, saved.id, { ...f.validBusiness, images: {}, revision: 1 }, { id: f.actor }), (error) => error.status === 409);
  assert.equal(f.rows.get(saved.id).name, "Edited Business");
});

test("failed uploads/database saves retain the old business and durable orphan cleanup reservations", async () => {
  for (const failure of ["uploadError", "saveError"]) {
    const f = businessFixture(); const saved = await create(f); const previous = { ...f.rows.get(saved.id) }; f.state[failure] = true;
    await assert.rejects(f.load("lib/businesses/server.js").saveBusiness(f.service, saved.id, { ...f.validBusiness, images: { logo: f.photo }, revision: 1 }, { id: f.actor }), (error) => error.status === 503);
    assert.deepEqual(f.rows.get(saved.id), previous); assert.equal(f.queue.size, 1); assert.equal(f.objects.has(previous.logo.path), true);
  }
});

test("failed retired-image cleanup succeeds as a save and preserves a retry queue", async () => {
  const f = businessFixture(); const saved = await create(f); const path = f.rows.get(saved.id).logo.path; f.state.removalError = true;
  const result = await f.load("lib/businesses/server.js").saveBusiness(f.service, saved.id, { ...f.validBusiness, images: { logo: f.photo }, revision: 1 }, { id: f.actor });
  assert.equal(result.cleanupPending, true); assert.equal(f.rows.get(saved.id).revision, 2); assert.ok(f.queue.has(path));
});

test("deletion requires confirmation, removes only server-selected files before the row and is retryable", async () => {
  for (const failure of [null, "removalError", "finishError"]) {
    const f = businessFixture(); const saved = await create(f); const server = f.load("lib/businesses/server.js");
    await assert.rejects(server.deleteBusiness(f.service, saved.id, { revision: 1 }), (error) => error.status === 422); assert.equal(f.rows.size, 1);
    f.state.events = []; if (failure) f.state[failure] = true;
    const body = { confirmation: "delete-business", revision: 1, paths: ["some-other-business/logo.png"] };
    if (failure) { await assert.rejects(server.deleteBusiness(f.service, saved.id, body), (error) => error.status === 503); assert.equal(f.rows.size, 1); assert.equal(f.rows.get(saved.id).deletion_pending, true); assert.equal(f.rows.get(saved.id).deletion_token, null); f.state[failure] = false; }
    await server.deleteBusiness(f.service, saved.id, body); assert.equal(f.rows.size, 0); assert.equal(f.objects.size, 0); assert.ok(f.state.events.indexOf("remove") < f.state.events.lastIndexOf("finish"));
    assert.ok(f.state.removals.every((paths) => paths.every((path) => path.startsWith(saved.id + "/"))));
    assert.equal((await server.deleteBusiness(f.service, saved.id, body)).deleted, true);
  }
});

test("deletion leases prevent edits and conflicting deletions, and bad stored paths are never removed", async () => {
  const f = businessFixture(); const saved = await create(f); const server = f.load("lib/businesses/server.js");
  await f.service.rpc("claim_business_deletion", { p_id: saved.id, p_revision: 1, p_token: "first" });
  await assert.rejects(server.deleteBusiness(f.service, saved.id, { revision: 1, confirmation: "delete-business" }), (error) => error.status === 409);
  await assert.rejects(server.saveBusiness(f.service, saved.id, { ...f.validBusiness, revision: 1 }, { id: f.actor }), (error) => error.status === 409);
  const row = f.rows.get(saved.id); row.deletion_locked_until = null; row.logo = { path: "foreign/logo.png" }; const removals = f.state.removals.length;
  await assert.rejects(server.deleteBusiness(f.service, saved.id, { revision: 1, confirmation: "delete-business" }), (error) => error.status === 503); assert.equal(f.state.removals.length, removals); assert.equal(f.rows.size, 1);
});
