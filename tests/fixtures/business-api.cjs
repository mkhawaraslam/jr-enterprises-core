const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const babel = require("@babel/core");
const ssr = require("@supabase/ssr");
const root = path.resolve(__dirname, "../..");
const actor = "00000000-0000-4000-8000-000000000099";
const image = fs.readFileSync(path.join(root, "public/assets/jr-logo.png"));
const photo = { name: "logo.png", type: "image/png", size: image.length, content: image.toString("base64") };
const validBusiness = { name: "Test Business", ntn: "1234567-8", email: "business@example.com", phone: "+92 302 6500974", address: "Test office, Islamabad", images: { logo: photo, signature: { ...photo, name: "signature.png" } } };

function businessFixture({ authenticated = true, configured = true } = {}) {
  const rows = new Map(); const queue = new Map(); const objects = new Map();
  const state = { authenticated, configured, events: [], uploads: [], removals: [], uploadError: false, removalError: false, saveError: false, finishError: false, queuedError: false, userChecks: 0, serviceClients: 0, signedError: false };
  class Query {
    constructor(table, service) { this.table = table; this.service = service; this.filters = []; }
    select(columns) { this.columns = columns; return this; }
    eq(key, value) { this.filters.push((row) => row[key] === value); return this; }
    in(key, values) { this.filters.push((row) => values.includes(row[key])); return this; }
    like(key, value) { this.filters.push((row) => row[key].startsWith(value.slice(0, -1))); return this; }
    lte(key, value) { this.filters.push((row) => row[key] <= value); return this; }
    order() { return this; }
    limit(value) { this.maximum = value; return this; }
    or(value) { const file = value.split(".eq.")[1].split(",")[0]; this.filters.push((row) => row.logo.path === file || row.signature.path === file); return this; }
    delete() { this.deleting = true; return this; }
    async insert(values) { if (!this.service) throw new Error("No browser writes"); if (state.queuedError) return { error: { message: "private queue failure" } }; for (const entry of values) queue.set(entry.path, { ...entry }); state.events.push("reserve"); return { error: null }; }
    async maybeSingle() { const data = rows.get(this.filters.length ? [...rows.values()].find((row) => this.filters.every((filter) => filter(row)))?.id : ""); return { data: data ? { ...data } : null, error: null }; }
    then(resolve, reject) {
      const values = this.table === "businesses" ? [...rows.values()] : [...queue.values()];
      let data = values.filter((row) => this.filters.every((filter) => filter(row)));
      if (this.maximum) data = data.slice(0, this.maximum);
      if (this.deleting) { if (!this.service) throw new Error("No browser writes"); for (const entry of data) queue.delete(entry.path); }
      return Promise.resolve({ data, error: null }).then(resolve, reject);
    }
  }
  const makeClient = (service) => ({
    auth: { getUser: async () => { state.userChecks++; return { data: { user: state.authenticated ? { id: actor, email: "staff@example.com" } : null }, error: null }; } },
    from: (table) => new Query(table, service),
    rpc: async (name, args) => {
      const fail = (message) => ({ error: { message } });
      if (name === "list_businesses") {
        const matched = [...rows.values()].filter((row) => [row.name, row.ntn, row.email, row.phone, row.address].join(" ").toLowerCase().includes(args.p_search.toLowerCase()));
        return { data: { items: matched.slice((args.p_page - 1) * 12, args.p_page * 12).map(({ deletion_token, deletion_locked_until, created_by, updated_by, ...row }) => row), count: matched.length }, error: null };
      }
      if (!service) throw new Error("Mutations must be service-only");
      const previous = rows.get(args.p_id);
      if (name === "save_business") {
        state.events.push("save"); if (state.saveError) return fail("private database error");
        if (args.p_revision != null && !previous) return fail("business_not_found");
        if (previous?.deletion_pending) return fail("deletion_pending");
        if (previous && previous.revision !== args.p_revision) return fail("business_changed");
        if (previous) for (const slot of ["logo", "signature"]) if (![args.p_logo.path, args.p_signature.path].includes(previous[slot].path)) queue.set(previous[slot].path, { path: previous[slot].path, run_after: new Date().toISOString() });
        rows.set(args.p_id, { id: args.p_id, ...args.p_values, logo: args.p_logo, signature: args.p_signature, revision: (previous?.revision || 0) + 1, created_by: previous?.created_by || args.p_actor, updated_by: args.p_actor, created_at: previous?.created_at || new Date().toISOString(), updated_at: new Date().toISOString(), deletion_pending: false });
        queue.delete(args.p_logo.path); queue.delete(args.p_signature.path);
        return { data: args.p_id, error: null };
      }
      if (name === "claim_business_deletion") {
        if (!previous) return { data: null, error: null };
        if (previous.revision !== args.p_revision) return fail("business_changed");
        if (previous.deletion_locked_until > Date.now()) return fail("deletion_busy");
        Object.assign(previous, { deletion_pending: true, deletion_token: args.p_token, deletion_locked_until: Date.now() + 120000 });
        return { data: { id: previous.id, logo: previous.logo, signature: previous.signature }, error: null };
      }
      if (name === "finish_business_deletion") {
        state.events.push("finish"); if (state.finishError) return fail("private delete failure");
        if (previous?.deletion_token !== args.p_token) return { data: false, error: null };
        rows.delete(args.p_id); return { data: true, error: null };
      }
      if (name === "release_business_deletion") { if (previous?.deletion_token === args.p_token) Object.assign(previous, { deletion_token: null, deletion_locked_until: null }); return { error: null }; }
      throw new Error("Unexpected RPC " + name);
    },
    storage: { from(bucket) { if (bucket !== "business-assets") throw new Error("Wrong bucket"); return {
      upload: async (file, bytes, options) => { if (!service) throw new Error("No browser uploads"); state.events.push("upload"); state.uploads.push({ file, options }); if (state.uploadError) return { error: { message: "private storage failure" } }; objects.set(file, bytes); return { error: null }; },
      remove: async (paths) => { if (!service) throw new Error("No browser removal"); state.events.push("remove"); state.removals.push([...paths]); if (state.removalError) return { error: { message: "private storage removal failure" } }; paths.forEach((file) => objects.delete(file)); return { error: null }; },
      createSignedUrls: async (paths, seconds) => { if (seconds !== 300) throw new Error("Unexpected URL lifetime"); return state.signedError ? { error: { message: "private signing error" } } : { data: paths.map((file) => ({ path: file, signedUrl: "https://project.supabase.co/signed/" + file })), error: null }; },
    }; } },
  });
  const service = makeClient(true); const user = makeClient(false); const cache = new Map();
  const env = { NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-key", ...(configured ? { SUPABASE_SECRET_KEY: "sb_secret_test-only" } : {}) };
  function load(file) {
    const full = path.resolve(root, file); if (cache.has(full)) return cache.get(full).exports;
    const module = { exports: {} }; cache.set(full, module);
    const { code } = babel.transformSync(fs.readFileSync(full, "utf8"), { babelrc: false, configFile: false, plugins: [require("next/dist/compiled/babel/plugin-transform-modules-commonjs")] });
    vm.runInNewContext(code, { module, exports: module.exports, Buffer, URL, Map, process: { env }, require(name) {
      if (name === "@supabase/supabase-js") return { createClient: () => { state.serviceClients++; return service; } };
      if (name === "@supabase/ssr") return { ...ssr, createServerClient: () => user };
      if (name.startsWith(".")) { const resolved = path.resolve(path.dirname(full), name); return load(resolved.endsWith(".js") ? resolved : resolved + ".js"); }
      return require(name);
    } });
    return module.exports;
  }
  return { load, rows, queue, objects, state, service, user, actor, image, photo, validBusiness };
}

function request(body, method = "POST", query = {}) { return { method, body, query, headers: { host: "localhost:3000", origin: "http://localhost:3000", "content-type": "application/json" } }; }
function response() { const headers = new Map(); return { headers, code: 200, setHeader: (name, value) => headers.set(name.toLowerCase(), value), getHeader: (name) => headers.get(name.toLowerCase()), status(code) { this.code = code; return this; }, json(body) { this.body = JSON.parse(JSON.stringify(body)); return this; } }; }
module.exports = { businessFixture, request, response };
