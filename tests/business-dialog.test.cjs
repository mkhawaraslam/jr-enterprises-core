const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const React = require("react");
const babel = require("@babel/core");
const { businessFixture } = require("./fixtures/business-api.cjs");
const root = path.resolve(__dirname, "..");

function dialogFixture({ mode = "create", valid = false, record = null, requestResult = {} } = {}) {
  const states = []; const refs = []; const calls = []; const notices = []; const focus = [];
  let stateIndex = 0; let refIndex = 0; let closes = 0; const cache = new Map();
  const data = businessFixture();
  const react = { ...React, useEffect() {}, useRef(value) { const index = refIndex++; return refs[index] ||= { current: value }; }, useState(value) {
    const index = stateIndex++;
    if (!(index in states)) states[index] = index === 1 ? record : index === 2 && valid ? data.validBusiness : index === 3 && valid ? data.validBusiness.images : index === 4 ? false : value;
    return [states[index], (next) => { states[index] = typeof next === "function" ? next(states[index]) : next; }];
  } };
  function load(file) {
    const full = path.resolve(root, file); if (cache.has(full)) return cache.get(full).exports;
    const module = { exports: {} }; cache.set(full, module);
    const { code } = babel.transformSync(fs.readFileSync(full, "utf8"), { babelrc: false, configFile: false, presets: [[require("next/dist/compiled/babel/preset-react"), { runtime: "automatic" }]], plugins: [require("next/dist/compiled/babel/plugin-transform-modules-commonjs")] });
    vm.runInNewContext(code, { module, exports: module.exports, URL, document: { getElementById: (id) => ({ focus: () => focus.push(id) }) }, require(name) {
      if (name === "react") return react;
      if (name.endsWith("PrototypeDialog")) return { __esModule: true, default: "dialog" };
      if (name.endsWith("businesses/browser")) return { encodeBusinessImage: async (image) => ({ ...image }), businessRequest: async (url, options) => { calls.push({ url, options }); if (requestResult instanceof Error) throw requestResult; return requestResult; } };
      if (name.startsWith(".")) { const resolved = path.resolve(path.dirname(full), name); return load(resolved.endsWith(".js") ? resolved : resolved + ".js"); }
      return require(name);
    } }); return module.exports;
  }
  const Component = load("components/Admin/BusinessDialog.js").default;
  const render = () => { stateIndex = 0; refIndex = 0; return Component({ selection: { mode, ...(record ? { id: record.id } : {}) }, onClose: () => closes++, onChanged: (notice) => notices.push(notice) }); };
  return { render, states, calls, notices, focus, get closes() { return closes; } };
}
function nodes(element) { const result = []; const visit = (item) => { if (Array.isArray(item)) item.forEach(visit); else if (item && typeof item === "object" && item.props) { result.push(item); visit(item.props.children); } }; visit(element); return result; }

test("the business form focuses validation errors without calling the API", async () => {
  const f = dialogFixture(); const form = nodes(f.render()).find((node) => node.type === "form");
  await form.props.onSubmit({ preventDefault() {} }); assert.equal(f.calls.length, 0); assert.equal(Object.keys(f.states[7]).length, 7); assert.equal(f.focus[0], "business-name");
});

test("saving a valid business sends images once, blocks repeated submits/dismissal and reports success", async () => {
  let resolve; const result = new Promise((done) => { resolve = done; }); const f = dialogFixture({ valid: true, requestResult: result });
  const element = f.render(); const form = nodes(element).find((node) => node.type === "form");
  const first = form.props.onSubmit({ preventDefault() {} }); await form.props.onSubmit({ preventDefault() {} }); element.props.onClose(); assert.equal(f.closes, 0);
  await new Promise(setImmediate); assert.equal(f.calls.length, 1); assert.equal(f.calls[0].options.method, "POST"); assert.ok(f.calls[0].options.body.images.signature);
  assert.equal(f.render().props.dismissible, false);
  resolve({ id: "created", cleanupPending: false }); await first; assert.equal(f.closes, 1); assert.deepEqual(f.notices, ["Business created."]); assert.equal(f.states[5], false);
});

test("server validation/conflict errors keep the editor open, expose field errors and allow retries", async () => {
  const failure = Object.assign(new Error("Reload before saving."), { status: 409, fields: { ntn: "Check NTN." } });
  const f = dialogFixture({ valid: true, requestResult: failure }); const form = nodes(f.render()).find((node) => node.type === "form");
  await form.props.onSubmit({ preventDefault() {} }); assert.equal(f.closes, 0); assert.equal(f.notices.length, 0); assert.equal(f.states[6], failure.message); assert.equal(f.states[7].ntn, "Check NTN."); assert.equal(f.states[8], true); assert.equal(f.states[5], false);
});

test("confirmed business deletion passes the revision, reports success and blocks duplicate clicks", async () => {
  let resolve; const result = new Promise((done) => { resolve = done; });
  const record = { id: "business-id", name: "Test", revision: 3, deletion_pending: false };
  const f = dialogFixture({ mode: "delete", record, requestResult: result });
  const button = nodes(f.render()).find((node) => node.type === "button" && React.Children.toArray(node.props.children).includes("Delete business"));
  const first = button.props.onClick(); await button.props.onClick(); assert.equal(f.calls.length, 1); assert.equal(f.calls[0].options.method, "DELETE"); assert.equal(f.calls[0].options.body.revision, 3); assert.equal(f.calls[0].options.body.confirmation, "delete-business");
  resolve({ deleted: true }); await first; assert.deepEqual(f.notices, ["Business and its images deleted."]); assert.equal(f.closes, 1);
});
