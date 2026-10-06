const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const babel = require("@babel/core");
const ssr = require("@supabase/ssr");
const root = path.resolve(__dirname, "..");
const normalize = (value) => JSON.parse(JSON.stringify(value));
const png = fs.readFileSync(path.join(root, "public/assets/jr-logo.png"));

function fixture({ configured = true, authenticated = true } = {}) {
  const rows = new Map();
  const objects = new Map();
  const limits = new Map();
  const signed = [];
  const cleanupQueue = new Map();
  const state = { authenticated, databaseError: false, signedError: false, signedReadResult: undefined, removalError: false, finishError: false, events: [], removals: [], downloads: 0, userChecks: 0, serviceClients: 0 };
  class Query {
    constructor(service) { this.service = service; this.filters = []; this.columns = "*"; }
    select(columns) { this.columns = columns; return this; }
    eq(key, value) { this.filters.push((row) => row[key] === value); return this; }
    is(key, value) { return this.eq(key, value); }
    update(values) { this.values = values; return this; }
    async insert(row) { if (state.databaseError) return { error: { message: "private SQL error" } }; rows.set(row.id, { ...normalize(row), submitted_at: null, reviewed_at: null, reviewed_by: null, photos_removed_at: null, cleanup_action: null }); return { error: null }; }
    async maybeSingle() {
      if (state.databaseError) return { error: { message: "private SQL error" } };
      const row = [...rows.values()].find((item) => (this.service || item.submitted_at) && this.filters.every((filter) => filter(item)));
      if (!row) return { data: null, error: null };
      const data = this.columns === "*" ? row : Object.fromEntries(this.columns.split(",").map((key) => [key, row[key]]));
      return { data: normalize(data), error: null };
    }
    then(resolve, reject) {
      const result = state.databaseError ? { error: { message: "private SQL error" } } : { error: null };
      if (!result.error && this.values) for (const row of rows.values()) if (this.filters.every((filter) => filter(row))) Object.assign(row, normalize(this.values));
      return Promise.resolve(result).then(resolve, reject);
    }
  }
  const client = (service) => ({
    auth: { getUser: async () => { state.userChecks += 1; return { data: { user: state.authenticated ? { id: "verified-user", email: "staff@example.com" } : null }, error: null }; } },
    from: (name) => { assert.equal(name, "quote_requests"); return new Query(service); },
    rpc: async (name, args) => {
      if (state.databaseError) return { error: { message: "private SQL error" } };
      if (name === "consume_quote_request_limit") {
        const attempts = (limits.get(args.p_fingerprint) || 0) + 1;
        limits.set(args.p_fingerprint, attempts);
        return { data: attempts <= 10, error: null };
      }
      if (name === "get_quote_request_counts") {
        const submitted = [...rows.values()].filter((row) => row.submitted_at);
        return { data: { total: submitted.length, unreviewed: submitted.filter((row) => !row.reviewed_at).length }, error: null };
      }
      if (["set_quote_request_review", "claim_quote_cleanup", "finish_quote_cleanup", "release_quote_cleanup"].includes(name)) {
        assert.equal(service, true, "mutations require the isolated service client");
        const row = rows.get(args.p_id);
        const conflict = (message) => ({ error: { code: "P0001", message } });
        if (name === "release_quote_cleanup") {
          if (row?.cleanup_token === args.p_token) Object.assign(row, { cleanup_token: null, cleanup_locked_until: null });
          return { error: null };
        }
        if (!row?.submitted_at) return { data: null, error: null };
        if (name === "set_quote_request_review") {
          if (row.cleanup_action) return conflict("cleanup_conflict");
          row.reviewed_at = args.p_reviewed ? row.reviewed_at || new Date().toISOString() : null;
          row.reviewed_by = args.p_reviewed ? row.reviewed_by || args.p_reviewer : null;
          return { data: { id: row.id, reviewed_at: row.reviewed_at, reviewed_by: row.reviewed_by }, error: null };
        }
        if (name === "claim_quote_cleanup") {
          if (!row.reviewed_at) return conflict("review_required");
          if ((row.cleanup_action && row.cleanup_action !== args.p_action) || row.cleanup_locked_until > Date.now()) return conflict("cleanup_conflict");
          Object.assign(row, { cleanup_action: args.p_action, cleanup_token: args.p_token, cleanup_locked_until: Date.now() + 120000 });
          return { data: { id: row.id, photos: normalize(row.photos) }, error: null };
        }
        state.events.push("finish");
        if (state.finishError) return { error: { message: "private finalize failure" } };
        if (row.cleanup_token !== args.p_token) return { data: false, error: null };
        if (row.photos.length && Date.parse(row.created_at) + 10800000 > Date.now()) cleanupQueue.set(row.id, row.photos.map((photo) => photo.path));
        if (row.cleanup_action === "request") rows.delete(row.id);
        else Object.assign(row, { photos: [], photos_removed_at: new Date().toISOString(), cleanup_action: null, cleanup_token: null, cleanup_locked_until: null });
        return { data: true, error: null };
      }
      assert.equal(name, "list_quote_requests");
      const matches = [...rows.values()].filter((row) => row.submitted_at && (args.p_status === "new" ? !row.reviewed_at : args.p_status === "reviewed" ? row.reviewed_at : true) && [row.full_name, row.phone, row.email, row.requirements].join(" ").toLowerCase().includes(args.p_search.toLowerCase()));
      const items = matches.slice((args.p_page - 1) * 10, args.p_page * 10).map(({ submission_token_hash, created_at, cleanup_token, cleanup_locked_until, ...row }) => row);
      return { data: { items, count: matches.length }, error: null };
    },
    storage: { from: (bucket) => {
      assert.equal(bucket, "quote-request-photos");
      return {
        createSignedUploadUrl: async (photoPath, options) => {
          signed.push({ path: photoPath, options: normalize(options) });
          return state.signedError ? { error: { message: "private storage error" } } : { data: { token: "upload-only-token" }, error: null };
        },
        download: async (photoPath) => {
          state.downloads += 1;
          const bytes = objects.get(photoPath);
          return bytes ? { data: new Blob([bytes]), error: null } : { error: { message: "not uploaded" } };
        },
        remove: async (paths) => {
          state.events.push("remove"); state.removals.push([...paths]);
          if (state.removalError) return { error: { message: "private storage removal error" } };
          paths.forEach((photoPath) => objects.delete(photoPath));
          return { error: null };
        },
        createSignedUrls: async (paths, expiry) => {
          assert.equal(expiry, 300);
          if (state.signedReadResult !== undefined) return state.signedReadResult;
          return { data: paths.map((photoPath) => ({ path: photoPath, signedUrl: "https://project.supabase.co/signed/" + photoPath })), error: null };
        },
      };
    } },
  });
  const service = client(true);
  const userClient = client(false);
  const env = { NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-key", ...(configured ? { SUPABASE_SECRET_KEY: "sb_secret_server-only" } : {}) };
  const cache = new Map();
  function load(file) {
    const full = path.resolve(root, file);
    if (cache.has(full)) return cache.get(full).exports;
    const module = { exports: {} }; cache.set(full, module);
    const { code } = babel.transformSync(fs.readFileSync(full, "utf8"), {
      babelrc: false, configFile: false,
      plugins: [require("next/dist/compiled/babel/plugin-transform-modules-commonjs")],
    });
    vm.runInNewContext(code, { module, exports: module.exports, process: { env }, Buffer, URL, Map, Blob,
      require(name) {
        if (name === "@supabase/supabase-js") return { createClient: () => { state.serviceClients += 1; return service; } };
        if (name === "@supabase/ssr") return { ...ssr, createServerClient: () => userClient };
        if (name.startsWith(".")) { const resolved = path.resolve(path.dirname(full), name); return load(resolved.endsWith(".js") ? resolved : resolved + ".js"); }
        return require(name);
      },
    });
    return module.exports;
  }
  return { load, service, state, rows, objects, signed, limits, env, cleanupQueue };
}

const valid = { fullName: "Ayesha Khan", phone: "+92 302 6500974", email: "", requirements: "10 pneumatic cylinders", attachments: [] };
const photo = { name: "reference.png", type: "image/png", size: png.length };
function request(body, method = "POST") {
  return { method, body, query: {}, headers: { host: "localhost:3000", origin: "http://localhost:3000", "content-type": "application/json" }, socket: { remoteAddress: "127.0.0.1" } };
}
function response() {
  const headers = new Map();
  return { headers, code: 200, setHeader: (key, value) => headers.set(key.toLowerCase(), value), getHeader: (key) => headers.get(key.toLowerCase()),
    status(code) { this.code = code; return this; }, json(data) { this.body = normalize(data); return this; } };
}

test("a photo-free request becomes visible only after verified completion", async () => {
  const f = fixture();
  const server = f.load("lib/quotes/server.js");
  const prepared = await server.prepareQuoteRequest(f.service, valid, "fingerprint");
  const row = f.rows.get(prepared.id);
  assert.equal(row.submitted_at, null);
  assert.equal(row.email, null);
  assert.notEqual(row.submission_token_hash, prepared.token);
  assert.equal(row.submission_token_hash.length, 64);
  assert.equal(prepared.uploads.length, 0);
  assert.deepEqual(normalize(await server.completeQuoteRequest(f.service, prepared)), { id: prepared.id });
  assert.ok(row.submitted_at);
  assert.equal(f.rows.size, 1);
});

test("multiple private photos use fixed server paths and are validated before saving", async () => {
  const f = fixture(); const server = f.load("lib/quotes/server.js");
  const prepared = await server.prepareQuoteRequest(f.service, { ...valid, attachments: [photo, { ...photo, name: "second.png" }] }, "client");
  assert.equal(prepared.uploads.length, 2);
  assert.ok(f.signed.every((upload) => upload.options.upsert === false));
  assert.equal(f.signed[0].path, prepared.id + "/1.png");
  for (const upload of prepared.uploads) f.objects.set(upload.path, png);
  await server.completeQuoteRequest(f.service, prepared);
  assert.ok(f.rows.get(prepared.id).submitted_at);
  assert.equal(f.state.downloads, 2);
});

test("invalid MIME, empty files, count and combined size fail before database/storage writes", async () => {
  for (const attachments of [
    [{ ...photo, name: "image.webp", type: "image/webp" }], [{ ...photo, size: 0 }],
    [null], Array(11).fill(photo), [{ ...photo, size: 3000000 }, { ...photo, size: 3000000 }],
  ]) {
    const f = fixture();
    await assert.rejects(f.load("lib/quotes/server.js").prepareQuoteRequest(f.service, { ...valid, attachments }, "client"), (error) => error.status === 422);
    assert.equal(f.rows.size, 0); assert.equal(f.signed.length, 0); assert.equal(f.limits.size, 0);
  }
});

test("forged completion tokens and expired uploads cannot submit a request", async () => {
  const f = fixture(); const server = f.load("lib/quotes/server.js");
  const prepared = await server.prepareQuoteRequest(f.service, valid, "client");
  await assert.rejects(server.completeQuoteRequest(f.service, { ...prepared, token: "0".repeat(64) }), (error) => error.status === 404);
  f.rows.get(prepared.id).created_at = new Date(Date.now() - 21 * 60 * 1000).toISOString();
  await assert.rejects(server.completeQuoteRequest(f.service, prepared), (error) => error.status === 410);
  assert.equal(f.rows.get(prepared.id).submitted_at, null);
});

test("missing, spoofed and size-mismatched uploads stay pending", async () => {
  for (const bytes of [null, Buffer.alloc(png.length), Buffer.concat([png, Buffer.from("extra")])]) {
    const f = fixture(); const server = f.load("lib/quotes/server.js");
    const prepared = await server.prepareQuoteRequest(f.service, { ...valid, attachments: [photo] }, "client");
    if (bytes) f.objects.set(prepared.uploads[0].path, bytes);
    await assert.rejects(server.completeQuoteRequest(f.service, prepared), (error) => error.status === 422);
    assert.equal(f.rows.get(prepared.id).submitted_at, null);
  }
});

test("completion retries are idempotent and do not revalidate or duplicate saved records", async () => {
  const f = fixture(); const server = f.load("lib/quotes/server.js");
  const prepared = await server.prepareQuoteRequest(f.service, { ...valid, attachments: [photo] }, "client");
  f.objects.set(prepared.uploads[0].path, png);
  await server.completeQuoteRequest(f.service, prepared);
  const submittedAt = f.rows.get(prepared.id).submitted_at;
  await server.completeQuoteRequest(f.service, prepared);
  assert.equal(f.rows.size, 1); assert.equal(f.state.downloads, 1);
  assert.equal(f.rows.get(prepared.id).submitted_at, submittedAt);
});

test("the database limiter persists across requests and honeypot input is rejected", async () => {
  const f = fixture(); const server = f.load("lib/quotes/server.js");
  for (let count = 0; count < 10; count += 1) await server.prepareQuoteRequest(f.service, valid, "one-client");
  await assert.rejects(server.prepareQuoteRequest(f.service, valid, "one-client"), (error) => error.status === 429);
  await assert.rejects(server.prepareQuoteRequest(f.service, { ...valid, website: "spam" }, "other-client"), (error) => error.status === 422);
  assert.equal(f.rows.size, 10);
});

test("public quote API rejects other methods, cross-site origins and non-JSON payloads", async () => {
  const f = fixture(); const handler = f.load("pages/api/quote-requests/index.js").default;
  for (const [req, expected] of [
    [request(valid, "GET"), 405],
    [{ ...request(valid), headers: { ...request(valid).headers, origin: "https://attacker.example" } }, 403],
    [{ ...request(valid), headers: { ...request(valid).headers, "content-type": "text/plain" } }, 415],
  ]) { const res = response(); await handler(req, res); assert.equal(res.code, expected); }
  assert.equal(f.state.serviceClients, 0); assert.equal(f.rows.size, 0);
});

test("public submission fails closed without a server key and never exposes provider errors", async () => {
  const f = fixture({ configured: false }); const res = response();
  await f.load("pages/api/quote-requests/index.js").default(request(valid), res);
  assert.equal(res.code, 503); assert.equal(f.rows.size, 0);
  const configured = fixture(); configured.state.databaseError = true; const failed = response();
  await configured.load("pages/api/quote-requests/index.js").default(request(valid), failed);
  assert.equal(failed.code, 503); assert.doesNotMatch(JSON.stringify(failed.body), /private SQL|sb_secret/);
  assert.match(failed.headers.get("cache-control"), /private.*no-store/);
});

test("public JSON endpoints reserve and complete without receiving the image bytes", async () => {
  const f = fixture(); const prepared = response();
  await f.load("pages/api/quote-requests/index.js").default(request({ ...valid, attachments: [photo] }), prepared);
  assert.equal(prepared.code, 200);
  f.objects.set(prepared.body.uploads[0].path, png);
  const complete = response();
  await f.load("pages/api/quote-requests/complete.js").default(request({ id: prepared.body.id, token: prepared.body.token }), complete);
  assert.equal(complete.code, 200); assert.equal(complete.body.id, prepared.body.id);
  assert.equal(f.rows.size, 1);
});

test("admin reads require a verified user and never use the service client", async () => {
  const f = fixture({ authenticated: false });
  for (const route of ["pages/api/admin/quote-requests/index.js", "pages/api/admin/quote-requests/[id].js"]) {
    const res = response(); await f.load(route).default(request({}, "GET"), res);
    assert.equal(res.code, 401); assert.match(res.headers.get("cache-control"), /private.*no-store/);
  }
  assert.equal(f.state.serviceClients, 0); assert.equal(f.state.userChecks, 2);
});

test("admin list searches and paginates only submitted data without exposing upload tokens", async () => {
  const f = fixture(); const server = f.load("lib/quotes/server.js");
  const pending = await server.prepareQuoteRequest(f.service, valid, "pending");
  for (let index = 0; index < 12; index += 1) {
    const row = await server.prepareQuoteRequest(f.service, { ...valid, fullName: "Buyer " + index }, "client-" + index);
    await server.completeQuoteRequest(f.service, row);
  }
  const handler = f.load("pages/api/admin/quote-requests/index.js").default;
  const res = response(); const req = request({}, "GET"); req.query = { page: "2", search: "Buyer" };
  await handler(req, res);
  assert.equal(res.code, 200); assert.equal(res.body.count, 12); assert.equal(res.body.items.length, 2);
  assert.doesNotMatch(JSON.stringify(res.body), /submission_token_hash|upload-only-token/);
  assert.ok(res.body.items.every((row) => row.id !== pending.id));
});

test("private photo detail URLs are signed only after authentication, and pending IDs return 404", async () => {
  const f = fixture(); const server = f.load("lib/quotes/server.js");
  const prepared = await server.prepareQuoteRequest(f.service, { ...valid, attachments: [photo] }, "client");
  const handler = f.load("pages/api/admin/quote-requests/[id].js").default;
  const req = request({}, "GET"); req.query.id = prepared.id;
  const pending = response(); await handler(req, pending); assert.equal(pending.code, 404);
  f.objects.set(prepared.uploads[0].path, png); await server.completeQuoteRequest(f.service, prepared);
  const submitted = response(); await handler(req, submitted);
  assert.equal(submitted.code, 200); assert.ok(submitted.body.photos[0].url.startsWith("https://project.supabase.co/"));
  assert.doesNotMatch(JSON.stringify(submitted.body), /submission_token_hash|created_at/);
});

test("admin photo details fail safely when signed links are missing or incomplete", async () => {
  const f = fixture(); const server = f.load("lib/quotes/server.js");
  const prepared = await server.prepareQuoteRequest(f.service, { ...valid, attachments: [photo] }, "client");
  f.objects.set(prepared.uploads[0].path, png); await server.completeQuoteRequest(f.service, prepared);
  const handler = f.load("pages/api/admin/quote-requests/[id].js").default;
  const req = request({}, "GET"); req.query.id = prepared.id;
  for (const result of [{ data: null }, { data: [] }, { data: [{ path: "other.png", signedUrl: "https://project.supabase.co/signed/other.png" }] }, { data: [{ path: prepared.uploads[0].path, error: "not found" }] }]) {
    f.state.signedReadResult = result;
    const res = response(); await handler(req, res);
    assert.equal(res.code, 503); assert.match(res.body.error, /Unable to load the product photos/);
  }
});

test("upload retries recognize duplicate-file responses without ignoring other storage errors", () => {
  const { isExistingQuotePhoto } = fixture().load("lib/quotes/browser.js");
  for (const error of [{ statusCode: "409" }, { statusCode: 400, code: "ResourceAlreadyExists" }, { statusCode: "400", message: "The resource already exists" }, { statusCode: 400, message: "Asset Already Exists" }]) assert.equal(isExistingQuotePhoto(error), true);
  for (const error of [null, { statusCode: 400, code: "InvalidSignature", message: "Invalid token" }, { statusCode: 403 }, { statusCode: 500, message: "The resource already exists" }]) assert.equal(isExistingQuotePhoto(error), false);
});

async function savedRequest(f, withPhotos = true) {
  const server = f.load("lib/quotes/server.js");
  const prepared = await server.prepareQuoteRequest(f.service, { ...valid, attachments: withPhotos ? [photo] : [] }, "client");
  if (withPhotos) f.objects.set(prepared.uploads[0].path, png);
  await server.completeQuoteRequest(f.service, prepared);
  return prepared;
}

test("shared counts exclude pending rows and stay global when the list is filtered", async () => {
  const f = fixture(); const server = f.load("lib/quotes/server.js");
  await server.prepareQuoteRequest(f.service, valid, "pending");
  const first = await savedRequest(f, false); const second = await savedRequest(f, false);
  await f.load("lib/quotes/admin.js").setQuoteReview(f.service, first.id, { reviewed: true }, { id: "verified-user" });
  const counts = response(); await f.load("pages/api/admin/quote-requests/counts.js").default(request({}, "GET"), counts);
  assert.deepEqual(normalize(counts.body), { total: 2, unreviewed: 1 });
  const req = request({}, "GET"); req.query = { status: "new", search: "", page: "1" };
  const list = response(); await f.load("pages/api/admin/quote-requests/index.js").default(req, list);
  assert.equal(list.body.count, 1); assert.equal(list.body.items[0].id, second.id);
  assert.doesNotMatch(JSON.stringify(list.body), /cleanup_token|cleanup_locked_until|submission_token_hash/);
});

test("review mutations use the verified account, preserve the first reviewer, and can be undone", async () => {
  const f = fixture(); const prepared = await savedRequest(f, false);
  const handler = f.load("pages/api/admin/quote-requests/[id]/review.js").default;
  const req = request({ reviewed: true, reviewer: "forged-account" }); req.query.id = prepared.id;
  const reviewed = response(); await handler(req, reviewed);
  assert.equal(reviewed.code, 200); assert.equal(reviewed.body.reviewed_by, "verified-user");
  const reviewedAt = reviewed.body.reviewed_at;
  await f.load("lib/quotes/admin.js").setQuoteReview(f.service, prepared.id, { reviewed: true }, { id: "another-account" });
  assert.equal(f.rows.get(prepared.id).reviewed_at, reviewedAt); assert.equal(f.rows.get(prepared.id).reviewed_by, "verified-user");
  const undone = response(); req.body = { reviewed: false }; await handler(req, undone);
  assert.equal(undone.body.reviewed_at, null); assert.equal(undone.body.reviewed_by, null);
});

test("review and deletion require authentication, same-origin JSON and the correct methods", async () => {
  for (const route of ["pages/api/admin/quote-requests/[id]/review.js", "pages/api/admin/quote-requests/[id]/photos.js", "pages/api/admin/quote-requests/[id].js"]) {
    const method = route.includes("review.js") ? "POST" : "DELETE";
    const f = fixture({ authenticated: false }); const handler = f.load(route).default;
    const req = request({ reviewed: true, confirmation: "delete-request" }, method); req.query.id = "00000000-0000-4000-8000-000000000001";
    const denied = response(); await handler(req, denied); assert.equal(denied.code, 401); assert.equal(f.state.serviceClients, 0);
    f.state.authenticated = true;
    for (const [headers, status] of [[{ ...req.headers, origin: "https://attacker.example" }, 403], [{ ...req.headers, "content-type": "text/plain" }, 415]]) {
      const rejected = response(); await handler({ ...req, headers }, rejected); assert.equal(rejected.code, status);
    }
    const wrongMethod = response(); await handler({ ...req, method: "PUT" }, wrongMethod); assert.equal(wrongMethod.code, 405);
    assert.equal(f.state.serviceClients, 0);
  }
});

test("cleanup requires explicit confirmation and prior review, and never accepts browser-supplied photo paths", async () => {
  const f = fixture(); const prepared = await savedRequest(f);
  const admin = f.load("lib/quotes/admin.js");
  await assert.rejects(admin.cleanQuoteRequest(f.service, prepared.id, "request", {}), (error) => error.status === 400);
  await assert.rejects(admin.cleanQuoteRequest(f.service, prepared.id, "request", { confirmation: "delete-request" }), (error) => error.status === 409);
  assert.equal(f.state.removals.length, 0);
  await admin.setQuoteReview(f.service, prepared.id, { reviewed: true }, { id: "verified-user" });
  await admin.cleanQuoteRequest(f.service, prepared.id, "request", { confirmation: "delete-request", photos: ["other-customer/file.png"] });
  assert.deepEqual(f.state.removals[0], [prepared.uploads[0].path]);
  assert.deepEqual(f.state.events, ["remove", "finish"]); assert.equal(f.rows.has(prepared.id), false); assert.equal(f.objects.size, 0);
  assert.deepEqual(f.cleanupQueue.get(prepared.id), [prepared.uploads[0].path]);
  await admin.cleanQuoteRequest(f.service, prepared.id, "request", { confirmation: "delete-request" });
  assert.equal(f.state.removals.length, 1, "retrying an already-deleted request is idempotent");
});

test("photo-only cleanup frees files but preserves customer information and review history", async () => {
  const f = fixture(); const prepared = await savedRequest(f); const admin = f.load("lib/quotes/admin.js");
  await admin.setQuoteReview(f.service, prepared.id, { reviewed: true }, { id: "verified-user" });
  const reviewedAt = f.rows.get(prepared.id).reviewed_at;
  await admin.cleanQuoteRequest(f.service, prepared.id, "photos", { confirmation: "remove-photos" });
  const row = f.rows.get(prepared.id); assert.equal(f.objects.size, 0); assert.equal(row.photos.length, 0);
  assert.equal(row.full_name, valid.fullName); assert.equal(row.requirements, valid.requirements);
  assert.equal(row.reviewed_at, reviewedAt); assert.ok(row.photos_removed_at); assert.equal(row.cleanup_action, null);
});

test("storage failure retains the request and paths, releases its lease and supports retry", async () => {
  const f = fixture(); const prepared = await savedRequest(f); const admin = f.load("lib/quotes/admin.js");
  await admin.setQuoteReview(f.service, prepared.id, { reviewed: true }, { id: "verified-user" });
  f.state.removalError = true;
  await assert.rejects(admin.cleanQuoteRequest(f.service, prepared.id, "request", { confirmation: "delete-request" }), /Photo removal failed/);
  const row = f.rows.get(prepared.id); assert.equal(row.photos.length, 1); assert.equal(row.cleanup_action, "request");
  assert.equal(row.cleanup_token, null); assert.equal(f.objects.size, 1); assert.equal(f.cleanupQueue.size, 0);
  const detail = response(); const req = request({}, "GET"); req.query.id = prepared.id;
  await f.load("pages/api/admin/quote-requests/[id].js").default(req, detail);
  assert.equal(detail.code, 200); assert.equal(detail.body.photos[0].url, null); assert.match(detail.body.photos_error, /cleanup/);
  f.state.removalError = false; await admin.cleanQuoteRequest(f.service, prepared.id, "request", { confirmation: "delete-request" });
  assert.equal(f.rows.has(prepared.id), false); assert.equal(f.objects.size, 0);
});

test("a database failure after file removal stays retryable without false success", async () => {
  const f = fixture(); const prepared = await savedRequest(f); const admin = f.load("lib/quotes/admin.js");
  await admin.setQuoteReview(f.service, prepared.id, { reviewed: true }, { id: "verified-user" });
  f.state.finishError = true;
  await assert.rejects(admin.cleanQuoteRequest(f.service, prepared.id, "photos", { confirmation: "remove-photos" }), /request update could not finish/);
  assert.equal(f.objects.size, 0); assert.equal(f.rows.get(prepared.id).photos.length, 1); assert.equal(f.rows.get(prepared.id).cleanup_token, null);
  f.state.finishError = false; await admin.cleanQuoteRequest(f.service, prepared.id, "photos", { confirmation: "remove-photos" });
  assert.equal(f.rows.get(prepared.id).photos.length, 0);
});

test("cleanup leases reject conflicting deletion and review operations", async () => {
  const f = fixture(); const prepared = await savedRequest(f); const admin = f.load("lib/quotes/admin.js");
  await admin.setQuoteReview(f.service, prepared.id, { reviewed: true }, { id: "verified-user" });
  const row = f.rows.get(prepared.id); Object.assign(row, { cleanup_action: "photos", cleanup_token: "active-token", cleanup_locked_until: Date.now() + 120000 });
  await assert.rejects(admin.cleanQuoteRequest(f.service, prepared.id, "request", { confirmation: "delete-request" }), (error) => error.status === 409);
  await assert.rejects(admin.cleanQuoteRequest(f.service, prepared.id, "photos", { confirmation: "remove-photos" }), (error) => error.status === 409);
  await assert.rejects(admin.setQuoteReview(f.service, prepared.id, { reviewed: false }, { id: "verified-user" }), (error) => error.status === 409);
  assert.equal(f.state.removals.length, 0);
});

test("the migration revokes public access, keeps hashes private and uses invoker listing permissions", () => {
  const sql = fs.readFileSync(path.join(root, "supabase/migrations/202610050001_quote_requests.sql"), "utf8");
  assert.match(sql, /alter table public\.quote_requests enable row level security/);
  assert.match(sql, /revoke all on public\.quote_requests from anon, authenticated/);
  assert.match(sql, /grant select \(id, full_name, phone, email, requirements, photos, submitted_at\)/);
  assert.match(sql, /for select to authenticated using \(submitted_at is not null\)/);
  assert.match(sql, /list_quote_requests[\s\S]*security invoker/);
  assert.match(sql, /false, 5242880, array\['image\/jpeg', 'image\/png'\]/);
  assert.doesNotMatch(sql, /security definer|for insert to anon|for select to anon|image\/webp/i);
});
