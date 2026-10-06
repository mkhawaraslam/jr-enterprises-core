const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const babel = require("@babel/core");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const root = path.resolve(__dirname, "../..");
const rows = [
  { id: "00000000-0000-4000-8000-000000000001", full_name: "Sample Buyer", phone: "03000000000", email: "buyer@example.com", requirements: "Pneumatic cylinders and fittings. Please share availability for 10 units.", submitted_at: "2026-10-06T04:30:00Z", reviewed_at: null, cleanup_action: null, photos: [{ path: "00000000-0000-4000-8000-000000000001/1.png", name: "pneumatic-cylinders.png", size: 597500, url: "/assets/product-collections/pneumatic-cylinders.png" }] },
  { id: "00000000-0000-4000-8000-000000000002", full_name: "Demo Workshop", phone: "03000000000", email: "", requirements: "Pressure gauges for a replacement installation.", submitted_at: "2026-10-06T03:15:00Z", reviewed_at: "2026-10-06T04:00:00Z", photos_removed_at: "2026-10-06T04:10:00Z", cleanup_action: null, photos: [] },
  { id: "00000000-0000-4000-8000-000000000003", full_name: "Test Purchasing Team", phone: "03000000000", email: "purchasing@example.com", requirements: "Solenoid valves. Please confirm compatible models.", submitted_at: "2026-10-05T07:45:00Z", reviewed_at: "2026-10-05T08:00:00Z", cleanup_action: "request", photos: [] },
];

function renderQuoteReviewUi({ view = "list", pending = false } = {}) {
  const cache = new Map();
  const request = view === "new-details" ? rows[0] : { ...rows[0], reviewed_at: "2026-10-06T04:40:00Z" };
  function load(file) {
    const full = path.resolve(root, file);
    if (cache.has(full)) return cache.get(full).exports;
    if (full.endsWith("/useQuoteRequestCounts.js")) return { __esModule: true, default: () => ({ total: 3, unreviewed: 1, revision: 0, error: "", refresh: () => {} }) };
    const module = { exports: {} }; cache.set(full, module);
    let index = 0;
    const values = full.endsWith("/QuoteRequests.js") ? [1, "all", { items: rows, count: 3 }, false, "", 0, view === "list" ? null : request.id] : full.endsWith("/QuoteRequestDetails.js") ? [view === "list" ? null : request, "", false, 0, view === "confirm" ? "request" : view === "photos-confirm" ? "photos" : null, pending, "", ""] : null;
    const react = values ? { ...React, useState: (initial) => React.useState(values[index++] ?? initial) } : React;
    const { code } = babel.transformSync(fs.readFileSync(full, "utf8"), { babelrc: false, configFile: false, presets: [[require("next/dist/compiled/babel/preset-react"), { runtime: "automatic" }]], plugins: [require("next/dist/compiled/babel/plugin-transform-modules-commonjs")] });
    vm.runInNewContext(code, { module, exports: module.exports, process: { env: {} }, URL, Map,
      require(name) {
        if (name === "react") return react;
        if (name === "next/router") return { useRouter: () => ({ push: () => {} }) };
        if (name === "next/image") return { __esModule: true, default: (props) => React.createElement("img", { src: "/assets/jr-logo.png", alt: props.alt, className: "h-full w-full object-contain" }) };
        if (name.endsWith(".png")) return {};
        if (name.startsWith(".")) {
          const resolved = path.resolve(path.dirname(full), name);
          if (resolved.endsWith(".json")) return require(resolved);
          const loaded = load(resolved.endsWith(".js") ? resolved : resolved + ".js");
          if (name === "./PrototypeDialog") return { ...loaded, __esModule: true, default: (props) => React.cloneElement(loaded.default(props), { open: props.open }) };
          return loaded;
        }
        return require(name);
      },
    });
    return module.exports;
  }
  const Dashboard = load("components/Admin/SalesDashboard.js").default;
  return renderToStaticMarkup(React.createElement(Dashboard, { initialModule: "requests", user: { id: "fixture-only", email: "admin@example.com", role: null } }));
}
module.exports = { renderQuoteReviewUi };
