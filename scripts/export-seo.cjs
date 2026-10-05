const fs = require("node:fs");
const path = require("node:path");
const { getSiteUrl, getRobotsPolicy, buildLandingSchema, serializeJsonLd, robotsText, sitemapXml } = require("../utils/seo");

const root = path.resolve(__dirname, "..");
require("@next/env").loadEnvConfig(root);
const baseUrl = getSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
const robots = getRobotsPolicy(process.env.VERCEL_ENV || process.env.NEXT_PUBLIC_VERCEL_ENV, process.env.NEXT_PUBLIC_NOINDEX);
fs.mkdirSync(path.join(root, "docs"), { recursive: true });
const json = serializeJsonLd(buildLandingSchema(baseUrl), 2);
fs.writeFileSync(path.join(root, "docs/structured-data.json"), json + "\n");
fs.writeFileSync(path.join(root, "docs/structured-data.html"), '<script type="application/ld+json">\n' + json + "\n</script>\n");
fs.writeFileSync(path.join(root, "public/robots.txt"), robotsText(baseUrl, robots));
fs.writeFileSync(path.join(root, "public/sitemap.xml"), sitemapXml(baseUrl, robots));
console.log("SEO files generated for " + baseUrl + " (" + robots + ")");
