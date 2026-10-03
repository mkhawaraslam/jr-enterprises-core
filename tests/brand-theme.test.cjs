const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const postcss = require("postcss");
const tailwindcss = require("tailwindcss");
const config = require("../tailwind.config.js");

const palette = config.theme.extend.colors.primary;
const projectRoot = path.resolve(__dirname, "..");

test("primary palette uses the requested brand colors", () => {
  assert.deepEqual(palette, {
    DEFAULT: "#C4212A",
    hover: "#A61A22",
    light: "#FBF0F1",
    dark: "#85141B",
    foreground: "#FFFFFF",
  });
  assert.equal(config.theme.colors.orange, undefined);
  assert.ok(config.theme.boxShadow.primary.includes(palette.DEFAULT));
  assert.ok(config.theme.boxShadow["primary-md"].includes(palette.DEFAULT));
});

test("global primary variables match the requested HSL values", () => {
  const css = postcss.parse(fs.readFileSync(path.join(projectRoot, "styles/tailwind.css"), "utf8"));
  const variables = {};
  css.walkRules(":root", (rule) => {
    rule.walkDecls((declaration) => {
      variables[declaration.prop] = declaration.value;
    });
  });
  assert.equal(variables["--primary"], "356 71% 45%");
  assert.equal(variables["--primary-foreground"], "0 0% 100%");
});

test("Tailwind generates semantic backgrounds, text, borders, focus rings and form accents", async () => {
  const classes = [
    "bg-primary", "hover:bg-primary-hover", "active:bg-primary-dark", "bg-primary-light",
    "text-primary", "text-primary-foreground", "border-primary", "ring-primary",
    "focus-visible:ring-primary", "focus-visible:outline-primary", "accent-primary",
    "hover:shadow-primary-md",
  ].join(" ");
  const result = await postcss([
    tailwindcss({ ...config, content: [{ raw: classes, extension: "html" }] }),
  ]).process("@tailwind utilities;", { from: undefined });

  const declarations = (selector) => {
    const values = {};
    result.root.walkRules(selector, (rule) => {
      rule.walkDecls((declaration) => {
        values[declaration.prop] = declaration.value;
      });
    });
    return values;
  };

  assert.equal(declarations(".bg-primary")["background-color"], "rgb(196 33 42 / var(--tw-bg-opacity))");
  assert.equal(declarations(".hover\\:bg-primary-hover:hover")["background-color"], "rgb(166 26 34 / var(--tw-bg-opacity))");
  assert.equal(declarations(".active\\:bg-primary-dark:active")["background-color"], "rgb(133 20 27 / var(--tw-bg-opacity))");
  assert.equal(declarations(".bg-primary-light")["background-color"], "rgb(251 240 241 / var(--tw-bg-opacity))");
  assert.equal(declarations(".text-primary").color, "rgb(196 33 42 / var(--tw-text-opacity))");
  assert.equal(declarations(".text-primary-foreground").color, "rgb(255 255 255 / var(--tw-text-opacity))");
  assert.equal(declarations(".border-primary")["border-color"], "rgb(196 33 42 / var(--tw-border-opacity))");
  for (const selector of [".ring-primary", ".focus-visible\\:ring-primary:focus-visible"]) {
    assert.equal(declarations(selector)["--tw-ring-color"], "rgb(196 33 42 / var(--tw-ring-opacity))");
  }
  assert.equal(declarations(".focus-visible\\:outline-primary:focus-visible")["outline-color"], palette.DEFAULT);
  assert.equal(declarations(".accent-primary")["accent-color"], palette.DEFAULT);
  assert.ok(declarations(".hover\\:shadow-primary-md:hover")["--tw-shadow"].includes(palette.DEFAULT));
});

test("primary button states and primary text meet normal-text contrast against their surfaces", () => {
  const luminance = (hex) => {
    const channels = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);
    const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  };
  const contrast = (first, second) => {
    const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
    return (values[0] + 0.05) / (values[1] + 0.05);
  };

  for (const color of [palette.DEFAULT, palette.hover, palette.dark]) {
    assert.ok(contrast(color, palette.foreground) >= 4.5, `${color} needs readable foreground text`);
  }
  assert.ok(contrast(palette.DEFAULT, palette.light) >= 4.5);
});

test("UI source files no longer contain legacy brand utilities or hardcoded primary colors", () => {
  const sourceFiles = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(entryPath) : /\.(jsx?|tsx?|html|css)$/.test(entry.name) ? [entryPath] : [];
  });
  for (const directory of ["components", "pages", "styles"]) {
    for (const file of sourceFiles(path.join(projectRoot, directory))) {
      const source = fs.readFileSync(file, "utf8");
      assert.doesNotMatch(source, /(?:text|bg|border|ring|outline|accent|shadow)-orange(?:-|\b)/, file);
      assert.doesNotMatch(source, /#(?:F53838|F53855|F59A9A|2563eb)\b/i, file);
    }
  }
});
