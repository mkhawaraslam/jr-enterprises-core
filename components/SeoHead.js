import Head from "next/head";
import { useRouter } from "next/router";
import business from "../data/business.json";
import site from "../data/site.json";
import { getSiteUrl, getRobotsPolicy, canonicalUrl, buildLandingSchema, serializeJsonLd } from "../utils/seo";

const SeoHead = (props = {}) => {
  const router = useRouter();
  const baseUrl = getSiteUrl(props.url || process.env.NEXT_PUBLIC_SITE_URL);
  const robots = getRobotsPolicy(process.env.NEXT_PUBLIC_VERCEL_ENV, process.env.NEXT_PUBLIC_NOINDEX);
  const meta = { ...site, siteName: business.name, type: "website", author: business.name, ...props };
  const title = meta.templateTitle ? `${meta.templateTitle} | ${meta.siteName}` : meta.title;
  const pageUrl = canonicalUrl(router.asPath, baseUrl);
  const imageUrl = new URL(meta.image, baseUrl).href;

  return (
    <Head>
      <title>{title}</title>
      <meta charSet="utf-8" key="charset" />
      <meta name="viewport" content="width=device-width, initial-scale=1" key="viewport" />
      <meta name="application-name" content={meta.siteName} key="application-name" />
      <meta name="description" content={meta.description} key="description" />
      <meta name="robots" content={robots.startsWith("noindex") ? robots : (meta.robots || robots)} key="robots" />
      <link rel="canonical" href={pageUrl} key="canonical" />
      <meta property="og:type" content={meta.type} key="og:type" />
      <meta property="og:site_name" content={meta.siteName} key="og:site_name" />
      <meta property="og:locale" content={meta.locale} key="og:locale" />
      <meta property="og:title" content={title} key="og:title" />
      <meta property="og:description" content={meta.description} key="og:description" />
      <meta property="og:url" content={pageUrl} key="og:url" />
      <meta property="og:image" content={imageUrl} key="og:image" />
      <meta property="og:image:width" content={String(meta.imageWidth)} key="og:image:width" />
      <meta property="og:image:height" content={String(meta.imageHeight)} key="og:image:height" />
      <meta property="og:image:type" content={meta.imageType} key="og:image:type" />
      <meta property="og:image:alt" content={meta.imageAlt} key="og:image:alt" />
      <meta name="twitter:card" content="summary_large_image" key="twitter:card" />
      <meta name="twitter:title" content={title} key="twitter:title" />
      <meta name="twitter:description" content={meta.description} key="twitter:description" />
      <meta name="twitter:image" content={imageUrl} key="twitter:image" />
      <meta name="twitter:image:alt" content={meta.imageAlt} key="twitter:image:alt" />
      {router.pathname === "/" && (
        <script
          key="landing-schema"
          id="landing-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildLandingSchema(baseUrl, meta.siteName)) }}
        />
      )}
      {meta.date && <meta property="article:published_time" content={meta.date} key="article:published_time" />}
      {meta.date && <meta property="article:author" content={meta.author} key="article:author" />}
      <link rel="icon" type="image/png" sizes="192x192" href="/favicon/favicon.png" />
      <link rel="apple-touch-icon" sizes="192x192" href="/favicon/favicon.png" />
      <link rel="manifest" href="/site.webmanifest" />
      <meta name="msapplication-TileColor" content="#C4212A" />
      <meta name="msapplication-TileImage" content="/favicon/favicon.png" />
      <meta name="theme-color" content="#C4212A" />
    </Head>
  );
};

export default SeoHead;
