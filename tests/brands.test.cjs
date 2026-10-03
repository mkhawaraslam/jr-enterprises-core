const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const parser = require("@babel/parser");
const postcss = require("postcss");
const tailwindcss = require("tailwindcss");
const brands = require("../data/brands.json");
const config = require("../tailwind.config.js");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("Our Brand includes all seventeen supplied brands without duplicates", () => {
  assert.deepEqual(brands.map(({ name }) => name), [
    "Shako", "CDC Pneumatics", "QITE", "Metal Work Pneumatic", "Rexroth",
    "Camozzi", "SMC", "Spirax Sarco", "ASCO Numatics", "Parker", "Norgren",
    "Festo", "Bosch", "KITZ", "GALA", "Dwyer", "WIKA",
  ]);
  assert.equal(new Set(brands.map(({ image }) => image)).size, brands.length);
});

test("every logo is local, has intrinsic dimensions and has a recorded source", () => {
  for (const brand of brands) {
    assert.ok(brand.image.startsWith("/assets/brands/"));
    assert.ok(brand.width > 0 && brand.height > 0);
    assert.ok(brand.source);
    const asset = fs.readFileSync(path.join(root, "public", brand.image));
    if (brand.image.endsWith(".png")) {
      assert.deepEqual(asset.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      assert.equal(asset.readUInt32BE(16), brand.width);
      assert.equal(asset.readUInt32BE(20), brand.height);
      const displayScale = Math.min(128 / brand.width, 48 / brand.height);
      assert.ok(displayScale <= 0.5, `${brand.name} should retain at least 2x pixel density`);
    } else {
      assert.match(asset.toString(), /<svg\s/);
      assert.match(asset.toString(), /viewBox=/);
      assert.doesNotMatch(asset.toString(), /<script\b|<foreignObject\b/i);
    }
  }
  const files = fs.readdirSync(path.join(root, "public/assets/brands"));
  assert.deepEqual(files.sort(), brands.map(({ image }) => path.basename(image)).sort());
});

test("Products starts with Brands and both logo sections use the shared marquee", () => {
  const feature = parser.parse(read("components/Feature.js"), { sourceType: "module", plugins: ["jsx"] });
  const elements = [];
  const visit = (node) => {
    if (!node || typeof node !== "object") return;
    if (node.type === "JSXOpeningElement" && node.name.type === "JSXIdentifier") elements.push(node.name.name);
    Object.values(node).forEach((value) => {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === "object") visit(value);
    });
  };
  visit(feature);
  assert.ok(elements.indexOf("Brands") < elements.indexOf("h2"));
  assert.match(read("components/Brands.js"), /<LogoMarquee\b/);
  assert.match(read("components/Testimonials.js"), /<LogoMarquee\b/);
});

test("the marquee loops right-to-left, pauses on hover and respects reduced motion", async () => {
  const source = read("components/misc/LogoMarquee.js");
  assert.doesNotMatch(source, /grayscale|hover:opacity|<button\b/);
  assert.match(source, /aria-hidden="true"/);
  const css = await postcss([
    tailwindcss({ ...config, content: [{ raw: source + read("components/Brands.js"), extension: "jsx" }] }),
  ]).process("@tailwind utilities;", { from: undefined });
  assert.match(css.css, /translateX\(-50%\)/);
  assert.match(css.css, /animation-play-state: paused/);
  assert.match(css.css, /prefers-reduced-motion: reduce/);
  assert.match(css.css, /animation: none/);
  assert.match(css.css, /animation-duration: 75s/);
});
