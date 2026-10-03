const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const React = require("react");
const babel = require("@babel/core");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "components/SeoHead.js"), "utf8");
const { code } = babel.transformSync(source, {
  babelrc: false,
  configFile: false,
  presets: [[require("next/dist/compiled/babel/preset-react"), { runtime: "automatic" }]],
  plugins: [require("next/dist/compiled/babel/plugin-transform-modules-commonjs")],
});

function renderHead(props = {}, router = { asPath: "/", pathname: "/" }, env = {}) {
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    process: { env },
    URL,
    require: (name) => {
      if (name === "next/head") return { __esModule: true, default: "head" };
      if (name === "next/router") return { useRouter: () => router };
      return require(name);
    },
  });
  const elements = [];
  const visit = (element) => {
    if (!React.isValidElement(element)) return;
    elements.push(element);
    React.Children.forEach(element.props.children, visit);
  };
  visit(module.exports.default(props));
  return elements;
}

const find = (elements, type, property, value) => elements.find((element) =>
  element.type === type && (!property || element.props[property] === value)
).props;

test("the homepage declares J.R Enterprises in browser, app, and sharing metadata", () => {
  const elements = renderHead();
  assert.equal(find(elements, "title").children, "J.R Enterprises");
  for (const [property, value] of [["name", "application-name"], ["property", "og:site_name"], ["property", "og:title"], ["name", "twitter:title"]]) {
    assert.equal(find(elements, "meta", property, value).content, "J.R Enterprises");
  }
  assert.match(find(elements, "meta", "name", "description").content, /industrial valves/);
  assert.doesNotMatch(source, /LaslesVPN|themewagon|Lorem Ipsum|@F2aldi/);
  assert.doesNotMatch(fs.readFileSync(path.join(root, "pages/index.js"), "utf8"), /LaslesVPN/);
});

test("canonical and image URLs point to the real deployment, not the template site", () => {
  const elements = renderHead();
  assert.equal(find(elements, "link", "rel", "canonical").href, "https://jr-enterprises-core.vercel.app/");
  assert.equal(find(elements, "meta", "property", "og:url").content, "https://jr-enterprises-core.vercel.app/");
  assert.equal(find(elements, "meta", "property", "og:image").content, "https://jr-enterprises-core.vercel.app/assets/jr-logo.png");
  assert.equal(find(elements, "link", "rel", "icon").href, "/favicon/favicon.png");
  assert.ok(fs.existsSync(path.join(root, "public/favicon/favicon.png")));
});

test("custom domain configuration and page titles work without query or fragment pollution", () => {
  const elements = renderHead({ templateTitle: "Products" }, { asPath: "/products?utm_source=test#brands", pathname: "/products" }, {
    NEXT_PUBLIC_SITE_URL: "https://example.com/",
  });
  assert.equal(find(elements, "title").children, "Products | J.R Enterprises");
  assert.equal(find(elements, "link", "rel", "canonical").href, "https://example.com/products");
  assert.equal(find(elements, "meta", "property", "og:image").content, "https://example.com/assets/jr-logo.png");
  assert.equal(elements.filter((element) => element.type === "script").length, 0);
});

test("homepage WebSite data provides the brand name and correctly escapes script markup", () => {
  const elements = renderHead();
  const schema = JSON.parse(find(elements, "script", "type", "application/ld+json").dangerouslySetInnerHTML.__html);
  assert.deepEqual(schema, {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "J.R Enterprises",
    url: "https://jr-enterprises-core.vercel.app/",
  });
  const escaped = find(renderHead({ siteName: "</script><script>" }), "script", "type", "application/ld+json").dangerouslySetInnerHTML.__html;
  assert.ok(!escaped.includes("<"));
  assert.equal(JSON.parse(escaped).name, "</script><script>");
});
