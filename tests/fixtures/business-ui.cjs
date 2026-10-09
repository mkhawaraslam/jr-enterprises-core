const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const babel = require("@babel/core");
const root = path.resolve(__dirname, "../..");
const record = { id: "00000000-0000-4000-8000-000000000001", name: "JR Enterprises", ntn: "1234567-8", email: "business@example.com", phone: "+92 302 6500974", address: "Test office, River View Commercial, Islamabad, Pakistan.", revision: 1, deletion_pending: false, logo: { path: "test-logo", url: "/assets/jr-logo.png", name: "company-logo.png" }, signature: { path: "test-signature", url: null, name: "signature.png" } };

function renderBusinessUi({ view = "list", pending = false } = {}) {
  const cache = new Map(); const selection = view === "list" ? null : { mode: view, ...(view !== "create" ? { id: record.id } : {}) };
  function load(file) {
    const full = path.resolve(root, file); if (cache.has(full)) return cache.get(full).exports;
    const module = { exports: {} }; cache.set(full, module); let states = 0;
    const shim = { ...React, useEffect() {}, useState(value) {
      const index = states++; let initial = value;
      if (full.endsWith("/Businesses.js")) { if (index === 2) initial = { items: [record, { ...record, id: "00000000-0000-4000-8000-000000000002", name: "Sample Engineering Supplies", email: "engineering@example.com", ntn: "7654321-0" }], count: 2 }; if (index === 3) initial = false; if (index === 6) initial = selection; }
      if (full.endsWith("/BusinessDialog.js")) { if (index === 1) initial = view === "create" ? null : record; if (index === 2) initial = view === "create" ? value : record; if (index === 4) initial = false; if (index === 5) initial = pending; }
      return React.useState(initial);
    } };
    const { code } = babel.transformSync(fs.readFileSync(full, "utf8"), { babelrc: false, configFile: false, presets: [[require("next/dist/compiled/babel/preset-react"), { runtime: "automatic" }]], plugins: [require("next/dist/compiled/babel/plugin-transform-modules-commonjs")] });
    vm.runInNewContext(code, { module, exports: module.exports, process: { env: {} }, URL, Map, Buffer, require(name) {
      if (name === "react") return shim;
      if (name === "next/router") return { useRouter: () => ({ push() {} }) };
      if (name === "next/image") return { __esModule: true, default: ({ alt }) => React.createElement("img", { src: "/assets/jr-logo.png", alt, width: 176, height: 48, className: "h-full w-full object-contain" }) };
      if (name.endsWith("useQuoteRequestCounts")) return { __esModule: true, default: () => ({ total: 0, unreviewed: 0, revision: 0, error: "", refresh() {} }) };
      if (name.endsWith("PrototypeDialog")) { const Dialog = load("components/Admin/PrototypeDialog.js").default; return { __esModule: true, default: (props) => React.cloneElement(Dialog(props), { open: props.open || undefined }) }; }
      if (name.endsWith(".png")) return {};
      if (name.startsWith(".")) { const resolved = path.resolve(path.dirname(full), name); if (/\.(json|cjs)$/.test(resolved)) return require(resolved); return load(resolved.endsWith(".js") ? resolved : resolved + ".js"); }
      return require(name);
    } });
    return module.exports;
  }
  const Dashboard = load("components/Admin/SalesDashboard.js").default;
  return renderToStaticMarkup(React.createElement(Dashboard, { initialModule: "business", user: { id: "test-only", email: "staff@example.com", role: null } }));
}
module.exports = { renderBusinessUi };
