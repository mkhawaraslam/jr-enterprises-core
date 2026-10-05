const business = require("../data/business.json");
const site = require("../data/site.json");
const content = require("../data/landingContent.json");
const collections = require("../data/productCollections.json");

const indexRobots = "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";

function getSiteUrl(configuredUrl) {
  const url = new URL(configuredUrl || site.productionUrl);
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("NEXT_PUBLIC_SITE_URL must be an HTTPS site origin, without a path, credentials, query, or fragment.");
  }
  return url.origin;
}

function getRobotsPolicy(environment, noindex) {
  return environment === "preview" || noindex === "true" ? "noindex, follow" : indexRobots;
}

function canonicalUrl(path, baseUrl) {
  const url = new URL(path || "/", baseUrl);
  return new URL(url.pathname, baseUrl).href;
}

function buildLandingSchema(baseUrl = site.productionUrl, siteName = business.name) {
  const home = new URL("/", getSiteUrl(baseUrl)).href;
  const id = (fragment) => home + "#" + fragment;
  const organization = {
    "@type": "Organization",
    "@id": id("organization"),
    name: business.name,
    url: home,
    description: site.description,
    foundingDate: business.foundingYear,
    logo: {
      "@type": "ImageObject",
      url: new URL("/assets/jr-logo.png", home).href,
      width: 1179,
      height: 292,
      caption: business.name + " logo",
    },
    telephone: business.phone,
    email: business.email,
    address: { "@type": "PostalAddress", ...business.address },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: business.phone,
      email: business.email,
      contactType: "sales and technical enquiries",
    },
    ...(business.socialProfiles.length ? { sameAs: business.socialProfiles } : {}),
  };

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite", "@id": id("website"), name: siteName, url: home,
        inLanguage: "en-PK", publisher: { "@id": id("organization") },
      },
      organization,
      {
        "@type": "CollectionPage", "@id": id("webpage"), url: home, name: site.title,
        description: content.summary, inLanguage: "en-PK",
        isPartOf: { "@id": id("website") }, about: { "@id": id("organization") },
        mainEntity: { "@id": id("catalog-products") }, hasPart: { "@id": id("faq") },
        primaryImageOfPage: {
          "@type": "ImageObject", url: new URL(site.image, home).href,
          width: site.imageWidth, height: site.imageHeight, caption: site.imageAlt,
        },
      },
      {
        "@type": "ItemList", "@id": id("catalog-products"), name: "Industrial product collections",
        numberOfItems: collections.length,
        itemListElement: collections.map((collection, index) => ({
          "@type": "ListItem", position: index + 1, item: { "@id": id(collection.id) },
        })),
      },
      // These are product collections, not individual SKUs with published offers.
      ...collections.map((collection) => ({
        "@type": "ProductCollection", "@id": id(collection.id), name: collection.title,
        category: collection.category, description: collection.alt,
        image: new URL(collection.image, home).href, url: id(collection.id),
        isPartOf: { "@id": id("webpage") },
      })),
      {
        "@type": "FAQPage", "@id": id("faq"), url: id("faq"), isPartOf: { "@id": id("webpage") },
        mainEntity: content.faqs.map((faq) => ({
          "@type": "Question", name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
    ],
  };
}

function serializeJsonLd(value, space) {
  return JSON.stringify(value, null, space).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

function robotsText(baseUrl, robots = indexRobots) {
  // Preview pages remain crawlable so their noindex metadata can be read.
  return "User-agent: *\nAllow: /\n" + (robots.startsWith("noindex") ? "" : "\nSitemap: " + new URL("/sitemap.xml", baseUrl).href + "\n");
}

function sitemapXml(baseUrl, robots = indexRobots) {
  const home = new URL("/", baseUrl).href.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    (robots.startsWith("noindex") ? "" : "  <url><loc>" + home + "</loc></url>\n") + "</urlset>\n";
}

module.exports = { getSiteUrl, getRobotsPolicy, canonicalUrl, buildLandingSchema, serializeJsonLd, robotsText, sitemapXml, indexRobots };
