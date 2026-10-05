const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const babel = require("@babel/core");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const vm = require("node:vm");
const postcss = require("postcss");
const tailwindcss = require("tailwindcss");
const config = require("../tailwind.config.js");
const seo = require("../utils/seo");
const site = require("../data/site.json");
const business = require("../data/business.json");
const content = require("../data/landingContent.json");
const collections = require("../data/productCollections.json");
const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

function renderComponent(file) {
  const { code } = babel.transformSync(read(file), {
    babelrc: false, configFile: false,
    presets: [[require("next/dist/compiled/babel/preset-react"), { runtime: "automatic" }]],
    plugins: [require("next/dist/compiled/babel/plugin-transform-modules-commonjs")],
  });
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module, exports: module.exports,
    require: (name) => {
      if (name === "next/image") return { __esModule: true, default: () => null };
      if (name.endsWith("ScrollAnimationWrapper")) return { __esModule: true, default: ({ as = "div", custom, children, ...props }) => React.createElement(as, props, children) };
      if (name.endsWith("/contact")) return { businessPhone: { whatsapp: "https://wa.me/923026500974" } };
      if (name.startsWith(".")) return require(path.resolve(root, path.dirname(file), name));
      return require(name);
    },
  });
  return renderToStaticMarkup(React.createElement(module.exports.default));
}

test("metadata lengths and the retained SEO summary meet the requested bounds", () => {
  assert.ok(site.title.length >= 50 && site.title.length <= 60);
  assert.ok(site.description.length >= 150 && site.description.length <= 160);
  const words = content.summary.split(/\s+/).length;
  assert.ok(words >= 40 && words <= 60);
  assert.equal(seo.buildLandingSchema()["@graph"].find((node) => node["@type"] === "CollectionPage").description, content.summary);
});

test("the homepage omits the intro and product guide while keeping the company H1", () => {
  const html = renderComponent("components/Hero.js");
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.match(html, /<h1 id="about-company"/);
  assert.match(html, /aria-labelledby="about-company"/);
  assert.doesNotMatch(html, /landing-heading|company-summary|Industrial Valves &amp;|Automation in Pakistan/);
  assert.ok(!html.includes(content.summary));
  assert.doesNotMatch(read("pages/index.js"), /ProductGuide/);
  assert.match(read("pages/index.js"), /<SeoHead\s*\/>/);
  assert.match(read("pages/index.js"), /<FAQs\s*\/>/);
});

test("visible FAQ answers exactly match the structured FAQ and use native disclosures", () => {
  const html = renderComponent("components/FAQs.js");
  const faq = seo.buildLandingSchema()["@graph"].find((node) => node["@type"] === "FAQPage");
  assert.equal((html.match(/<details\b/g) || []).length, content.faqs.length);
  assert.equal((html.match(/<h3\b/g) || []).length, content.faqs.length);
  for (const [index, item] of content.faqs.entries()) {
    assert.ok(html.includes(item.question));
    assert.ok(html.includes(item.answer));
    assert.equal(faq.mainEntity[index].name, item.question);
    assert.equal(faq.mainEntity[index].acceptedAnswer.text, item.answer);
  }
});

test("the retained product guide provides semantic comparisons, a checklist and real collection anchors", () => {
  const html = renderComponent("components/ProductGuide.js");
  assert.match(html, /<table\b/);
  assert.match(html, /<caption\b/);
  assert.match(html, /<thead\b/);
  assert.match(html, /<tbody\b/);
  assert.match(html, /scope="col"/);
  assert.equal((html.match(/scope="row"/g) || []).length, collections.length);
  assert.match(html, /<ul\b/);
  assert.match(html, /<ol\b/);
  assert.equal(content.selection.length, collections.length);
  for (const collection of collections) {
    assert.equal(content.selection.filter((item) => item.id === collection.id).length, 1);
    assert.ok(html.includes('href="#' + collection.id + '"'));
  }
  assert.ok(html.includes("All pricing is quotation-only."));
});

test("the graph uses real supplier details, product collections and no unsupported commerce claims", () => {
  const graph = seo.buildLandingSchema()["@graph"];
  const organization = graph.find((node) => node["@type"] === "Organization");
  assert.equal(organization.email, business.email);
  assert.equal(organization.telephone, business.phone);
  assert.deepEqual(organization.address, { "@type": "PostalAddress", ...business.address });
  assert.equal(organization.foundingDate, "2012");
  assert.equal(organization.sameAs, undefined);
  const quoteAnswer = content.faqs.find((faq) => faq.question === "How can I request a product quotation?").answer;
  assert.ok(quoteAnswer.includes(business.email));
  assert.ok(quoteAnswer.includes(business.phoneDisplay));
  assert.ok(content.faqs.find((faq) => faq.question === "Where is J.R Enterprises located?").answer.includes(business.addressDisplay.slice(0, -1)));
  const products = graph.filter((node) => node["@type"] === "ProductCollection");
  assert.equal(products.length, collections.length);
  for (const [index, product] of products.entries()) {
    assert.equal(product.name, collections[index].title);
    assert.equal(product.image, site.productionUrl + collections[index].image);
    assert.ok(fs.existsSync(path.join(root, "public", new URL(product.image).pathname)));
    assert.equal(product.url, site.productionUrl + "/#" + collections[index].id);
  }
  assert.doesNotMatch(JSON.stringify(graph), /SearchAction|SoftwareApplication|aggregateRating|"offers"|"price"|"availability"/);
  const ids = graph.map((node) => node["@id"]);
  assert.equal(new Set(ids).size, ids.length);
  const visit = (node) => {
    if (!node || typeof node !== "object") return;
    if (node["@id"]) assert.ok(ids.includes(node["@id"]), "Missing linked entity: " + node["@id"]);
    Object.values(node).forEach(visit);
  };
  graph.forEach(visit);
});

test("canonical, robots and sitemap policies agree and preview URLs are excluded", () => {
  assert.equal(seo.getSiteUrl(), site.productionUrl);
  assert.equal(seo.getSiteUrl("https://example.com/"), "https://example.com");
  for (const url of ["http://example.com", "https://example.com/path", "https://example.com?x=1", "https://user:password@example.com"]) {
    assert.throws(() => seo.getSiteUrl(url));
  }
  assert.equal(seo.canonicalUrl("/?utm_source=test#faq", site.productionUrl), site.productionUrl + "/");
  assert.equal(seo.canonicalUrl("https://other.example/products?x=1", site.productionUrl), site.productionUrl + "/products");
  assert.match(seo.robotsText(site.productionUrl), /Sitemap: https:\/\/www\.jrenterprisespk\.com\/sitemap\.xml/);
  assert.match(seo.sitemapXml(site.productionUrl), /<loc>https:\/\/www\.jrenterprisespk\.com\/<\/loc>/);
  assert.doesNotMatch(seo.robotsText(site.productionUrl, "noindex, follow"), /Sitemap:|Disallow: \/\n/);
  assert.doesNotMatch(seo.sitemapXml(site.productionUrl, "noindex, follow"), /<loc>/);
  assert.equal(seo.getRobotsPolicy("preview"), "noindex, follow");
  assert.equal(seo.getRobotsPolicy("production", "true"), "noindex, follow");
  assert.equal(seo.getRobotsPolicy("production", "false"), seo.indexRobots);
  assert.match(read("next.config.js"), /NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV/);
});

test("script serialization is safe and generated deliverables match the live graph", () => {
  const unsafe = { text: "</script>\u2028\u2029" };
  const safe = seo.serializeJsonLd(unsafe);
  assert.doesNotMatch(safe, /<|\u2028|\u2029/);
  assert.deepEqual(JSON.parse(safe), unsafe);
  assert.deepEqual(JSON.parse(read("docs/structured-data.json")), seo.buildLandingSchema());
  assert.equal(read("docs/structured-data.html"), '<script type="application/ld+json">\n' + seo.serializeJsonLd(seo.buildLandingSchema(), 2) + "\n</script>\n");
  assert.equal(read("public/robots.txt"), seo.robotsText(site.productionUrl));
  assert.equal(read("public/sitemap.xml"), seo.sitemapXml(site.productionUrl));
  assert.equal(require("../package.json").scripts.prebuild, "npm run seo:export");
});

test("page landmarks, heading levels and stable image layouts are retained", () => {
  assert.match(read("components/Layout/Layout.js"), /<main id="main-content"/);
  assert.match(read("components/Layout/Header.js"), /<header\b/);
  assert.match(read("components/Layout/Header.js"), /href: "#" \+ item.id/);
  assert.match(read("components/Layout/Header.js"), /<li key=\{item.id\}/);
  assert.match(read("components/Layout/Footer.js"), /<footer\b/);
  assert.match(read("components/Hero.js"), /width=\{612\}/);
  assert.match(read("components/Hero.js"), /height=\{408\}/);
  assert.match(read("components/Feature.js"), /aspect-\[4\/5\]/);
  assert.match(read("components/Feature.js"), /id=\{collection.id\}/);
  for (const file of ["components/ProductGuide.js", "components/FAQs.js"]) {
    assert.doesNotMatch(read(file), /ScrollAnimationWrapper|<h[4-6]\b/);
  }
});

test("Tailwind emits FAQ open states, scrollable tables and keyboard focus styles", async () => {
  const css = await postcss([tailwindcss({ ...config, content: [{ raw: read("components/ProductGuide.js") + read("components/FAQs.js"), extension: "jsx" }] })]).process("@tailwind utilities;", { from: undefined });
  assert.match(css.css, /\.group\[open\]/);
  assert.match(css.css, /overflow-x: auto/);
  assert.match(css.css, /--tw-ring-color: rgb\(196 33 42/);
});
