const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const postcss = require("postcss");
const tailwindcss = require("tailwindcss");
const collections = require("../data/productCollections.json");
const config = require("../tailwind.config.js");

const projectRoot = path.resolve(__dirname, "..");

test("the gallery contains all ten supplied product collections", () => {
  assert.deepEqual(collections.map(({ title }) => title), [
    "Pneumatic Cylinders",
    "Pneumatic Pipes & Fittings",
    "Solenoid Valves",
    "Mechanical, Foot & Hand Valves",
    "Hydraulic Valves & Seals",
    "Air Service Units",
    "Pressure Gauges & Transmitters",
    "Normally Closed & Open Valves",
    "Angle Valves",
    "Manual & Auto Operated Valves",
  ]);
  assert.equal(new Set(collections.map(({ id }) => id)).size, collections.length);
  assert.equal(new Set(collections.map(({ image }) => image)).size, collections.length);
  for (const collection of collections) {
    assert.ok(collection.category.trim());
    assert.ok(collection.alt.trim());
    assert.equal(collection.image, `/assets/product-collections/${collection.id}.png`);
  }
});

test("every collection references an intact local portrait PNG", () => {
  for (const { image } of collections) {
    const png = fs.readFileSync(path.join(projectRoot, "public", image));
    assert.deepEqual(png.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    assert.equal(png.toString("ascii", 12, 16), "IHDR");
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);
    assert.ok(width >= 984, image);
    assert.ok(height > width, image);
  }
});

test("Tailwind emits responsive columns, uncropped image sizing and motion-safe hover styles", async () => {
  const source = fs.readFileSync(path.join(projectRoot, "components/Feature.js"), "utf8");
  const result = await postcss([
    tailwindcss({ ...config, content: [{ raw: source, extension: "jsx" }] }),
  ]).process("@tailwind utilities;", { from: undefined });
  const rule = (selector) => {
    let found;
    result.root.walkRules(selector, (candidate) => { found = candidate; });
    assert.ok(found, `${selector} should be generated`);
    return found;
  };
  const declaration = (selector, property) =>
    rule(selector).nodes.find((node) => node.prop === property).value;

  assert.equal(declaration(".grid-cols-1", "grid-template-columns"), "repeat(1, minmax(0, 1fr))");
  assert.equal(declaration(".sm\\:grid-cols-2", "grid-template-columns"), "repeat(2, minmax(0, 1fr))");
  assert.equal(declaration(".lg\\:grid-cols-3", "grid-template-columns"), "repeat(3, minmax(0, 1fr))");
  assert.equal(declaration(".aspect-\\[4\\/5\\]", "aspect-ratio"), "4/5");
  assert.equal(declaration(".object-contain", "object-fit"), "contain");
  assert.equal(rule(".motion-safe\\:hover\\:-translate-y-1:hover").parent.params,
    "(prefers-reduced-motion: no-preference)");
});
