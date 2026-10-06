const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const babel = require("@babel/core");
const flush = () => new Promise((resolve) => setImmediate(resolve));

function fixture() {
  const effects = []; const timers = new Map(); const calls = [];
  const window = new EventTarget(); const document = new EventTarget(); document.visibilityState = "visible";
  let state; let ref; let nextTimer = 0;
  const data = { total: 3, unreviewed: 2, fail: false };
  const { code } = babel.transformSync(fs.readFileSync(path.join(__dirname, "../components/Admin/useQuoteRequestCounts.js"), "utf8"), { babelrc: false, configFile: false, plugins: [require("next/dist/compiled/babel/plugin-transform-modules-commonjs")] });
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, window, document, AbortController,
    setTimeout(fn, ms) { timers.set(++nextTimer, { fn, ms }); return nextTimer; }, clearTimeout(id) { timers.delete(id); },
    require(name) {
      if (name === "react") return {
        useState(initial) { state = initial; return [state, (next) => { state = typeof next === "function" ? next(state) : next; }]; },
        useRef(initial) { ref = { current: initial }; return ref; },
        useCallback(fn) { return fn; }, useEffect(fn) { effects.push(fn); },
      };
      assert.equal(name, "../../lib/quotes/adminBrowser");
      return { adminQuoteRequest: async (url, options) => {
        calls.push({ url, signal: options.signal });
        if (data.fail) throw new Error("Counts unavailable");
        return { total: data.total, unreviewed: data.unreviewed };
      } };
    },
  });
  const result = module.exports.default(); const stop = effects[0]();
  return { data, calls, window, document, timers, result, stop, read: () => state };
}

test("count polling uses the unfiltered endpoint, refreshes after mutations, and runs every 30 seconds", async () => {
  const f = fixture(); await flush();
  assert.equal(f.read().unreviewed, 2); assert.equal(f.calls[0].url, "/api/admin/quote-requests/counts");
  assert.equal([...f.timers.values()][0].ms, 30000);
  f.data.unreviewed = 0; f.window.dispatchEvent(new Event("quote-requests-changed")); await flush();
  assert.equal(f.read().unreviewed, 0); assert.equal(f.read().revision, 2);
  f.stop(); assert.equal(f.timers.size, 0);
});

test("hidden tabs stop polling and visible/focused tabs refresh without writing after unmount", async () => {
  const f = fixture(); await flush(); const count = f.calls.length;
  f.document.visibilityState = "hidden"; f.document.dispatchEvent(new Event("visibilitychange")); await flush();
  assert.equal(f.calls.length, count); assert.equal(f.timers.size, 0); assert.equal(f.calls[0].signal.aborted, true);
  f.document.visibilityState = "visible"; f.document.dispatchEvent(new Event("visibilitychange")); await flush();
  assert.equal(f.calls.length, count + 1);
  f.window.dispatchEvent(new Event("focus")); await flush(); assert.equal(f.calls.length, count + 2);
  f.stop(); f.window.dispatchEvent(new Event("focus")); f.window.dispatchEvent(new Event("quote-requests-changed")); await flush();
  assert.equal(f.calls.length, count + 2);
});

test("failed or malformed count reads cannot display stale numbers or a misleading zero", async () => {
  const f = fixture(); await flush(); f.data.fail = true;
  f.result.refresh(); await flush(); assert.equal(f.read().total, null); assert.equal(f.read().unreviewed, null); assert.match(f.read().error, /unavailable/);
  f.data.fail = false; f.data.unreviewed = 8; f.result.refresh(); await flush();
  assert.equal(f.read().unreviewed, null); assert.match(f.read().error, /unavailable/);
  f.data.unreviewed = 1; f.result.refresh(); await flush(); assert.equal(f.read().unreviewed, 1); assert.equal(f.read().error, "");
  f.stop();
});
