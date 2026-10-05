const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const React = require("react");
const babel = require("@babel/core");
const site = require("../data/site.json");
const business = require("../data/business.json");
const { buildLandingSchema, indexRobots } = require("../utils/seo");

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
  assert.equal(find(elements, "title").children, site.title);
  for (const [property, value] of [["name", "application-name"], ["property", "og:site_name"]]) {
    assert.equal(find(elements, "meta", property, value).content, business.name);
  }
  for (const [property, value] of [["property", "og:title"], ["name", "twitter:title"]]) {
    assert.equal(find(elements, "meta", property, value).content, site.title);
  }
  assert.match(find(elements, "meta", "name", "description").content, /industrial valves/);
  assert.doesNotMatch(source, /LaslesVPN|themewagon|Lorem Ipsum|@F2aldi/);
  assert.doesNotMatch(fs.readFileSync(path.join(root, "pages/index.js"), "utf8"), /LaslesVPN/);
});

test("canonical and image URLs point to the real deployment, not the template site", () => {
  const elements = renderHead();
  assert.equal(find(elements, "link", "rel", "canonical").href, site.productionUrl + "/");
  assert.equal(find(elements, "meta", "property", "og:url").content, site.productionUrl + "/");
  assert.equal(find(elements, "meta", "property", "og:image").content, site.productionUrl + site.image);
  assert.equal(find(elements, "link", "rel", "icon").href, "/favicon/favicon.png");
  assert.ok(fs.existsSync(path.join(root, "public/favicon/favicon.png")));
});

test("custom domain configuration and page titles work without query or fragment pollution", () => {
  const elements = renderHead({ templateTitle: "Products" }, { asPath: "/products?utm_source=test#brands", pathname: "/products" }, {
    NEXT_PUBLIC_SITE_URL: "https://example.com/",
  });
  assert.equal(find(elements, "title").children, "Products | J.R Enterprises");
  assert.equal(find(elements, "link", "rel", "canonical").href, "https://example.com/products");
  assert.equal(find(elements, "meta", "property", "og:image").content, "https://example.com" + site.image);
  assert.equal(elements.filter((element) => element.type === "script").length, 0);
});

test("homepage metadata emits the complete shared graph and safely escapes script markup", () => {
  const elements = renderHead();
  const schema = JSON.parse(find(elements, "script", "type", "application/ld+json").dangerouslySetInnerHTML.__html);
  assert.deepEqual(schema, buildLandingSchema());
  const escaped = find(renderHead({ siteName: "</script><script>" }), "script", "type", "application/ld+json").dangerouslySetInnerHTML.__html;
  assert.ok(!escaped.includes("<"));
  assert.equal(JSON.parse(escaped)["@graph"][0].name, "</script><script>");
});

test("production metadata includes snippet permissions, viewport, charset and complete social image fields", () => {
  const elements = renderHead();
  assert.equal(find(elements, "meta", "name", "robots").content, indexRobots);
  assert.equal(find(elements, "meta", "name", "viewport").content, "width=device-width, initial-scale=1");
  assert.equal(find(elements, "meta", "charSet", "utf-8").charSet, "utf-8");
  assert.equal(find(elements, "meta", "property", "og:image:width").content, String(site.imageWidth));
  assert.equal(find(elements, "meta", "property", "og:image:height").content, String(site.imageHeight));
  assert.equal(find(elements, "meta", "property", "og:image:type").content, site.imageType);
  assert.equal(find(elements, "meta", "property", "og:image:alt").content, site.imageAlt);
  assert.equal(find(elements, "meta", "name", "twitter:card").content, "summary_large_image");
  assert.equal(find(elements, "meta", "name", "twitter:image:alt").content, site.imageAlt);
});

test("preview and explicit staging deployments cannot override noindex using page props", () => {
  for (const env of [{ NEXT_PUBLIC_VERCEL_ENV: "preview" }, { NEXT_PUBLIC_NOINDEX: "true" }]) {
    const elements = renderHead({ robots: "index, follow" }, { asPath: "/", pathname: "/" }, env);
    assert.equal(find(elements, "meta", "name", "robots").content, "noindex, follow");
  }
});
