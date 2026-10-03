import Head from "next/head";
import { useRouter } from "next/router";


// Default value for some meta data
const defaultMeta = {
  title: 'J.R Enterprises',
  siteName: 'J.R Enterprises',
  description:
    'J.R Enterprises supplies industrial valves, pneumatic and hydraulic components, measuring instruments, and automation products across Pakistan and abroad.',
  // change base url of your web (without '/' at the end)
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://jr-enterprises-core.vercel.app',
  type: 'website',
  robots: 'follow, index',
  // change with url of your image (recommended dimension = 1.91:1)
  // used in twitter, facebook, etc. card when link copied in tweet/status 
  image: '/assets/jr-logo.png',
  author: 'J.R Enterprises'
};

/**
 * Next Head component populated with necessary SEO tags and title
 * props field used:
 * - title
 * - siteName
 * - description
 * - url
 * - type
 * - robots
 * - image
 * - date
 * - author
 * - templateTitle
 * all field are optional (default value defined on defaultMeta)
 * @example
 * <SeoHead title="Page's Title" />
 */
const SeoHead = (props) => {
  const router = useRouter();
  const meta = {
    ...defaultMeta,
    ...props
  };

  // Use siteName if there is templateTitle
  // but show full title if there is none
  meta.title = props.templateTitle
    ? `${props.templateTitle} | ${meta.siteName}`
    : meta.title;

  const pageUrl = new URL(router.asPath, meta.url);
  pageUrl.search = '';
  pageUrl.hash = '';
  const imageUrl = new URL(meta.image, meta.url).href;

  return (
    <Head>
      <title>{meta.title}</title>
      <meta name='application-name' content={meta.siteName} />
      <meta name='robots' content={meta.robots} />
      <meta content={meta.description} name='description' />
      <meta property='og:url' content={pageUrl.href} />
      <link rel='canonical' href={pageUrl.href} />
      {/* Open Graph */}
      <meta property='og:type' content={meta.type} />
      <meta property='og:site_name' content={meta.siteName} />
      <meta property='og:description' content={meta.description} />
      <meta property='og:title' content={meta.title} />
      <meta name='image' property='og:image' content={imageUrl} />
      {/* Twitter */}
      <meta name='twitter:card' content='summary_large_image' />
      <meta name='twitter:title' content={meta.title} />
      <meta name='twitter:description' content={meta.description} />
      <meta name='twitter:image' content={imageUrl} />
      {router.pathname === '/' && (
        <script
          key='website-schema'
          type='application/ld+json'
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: meta.siteName,
              url: new URL('/', meta.url).href,
            }).replace(/</g, '\\u003c'),
          }}
        />
      )}
      {meta.date && (
        <>
          <meta property='article:published_time' content={meta.date} />
          <meta
            name='publish_date'
            property='og:publish_date'
            content={meta.date}
          />
          <meta
            name='author'
            property='article:author'
            content={meta.author}
          />
        </>
      )}
      {/* Favicons */}
      {favicons.map((linkProps) => (
        <link key={`${linkProps.rel}-${linkProps.href}`} {...linkProps} />
      ))}
      {/* Windows 8 app icon */}
      <meta name='msapplication-TileColor' content='#C4212A' />
      <meta
        name='msapplication-TileImage'
        content='/favicon/favicon.png'
      />
      {/* Accent color on supported browser */}
      <meta name='theme-color' content='#C4212A' />
    </Head>
  );
};

// Favicons, other icons, and manifest definition
const favicons = [
  {
    rel: 'icon',
    type: 'image/png',
    sizes: '192x192',
    href: '/favicon/favicon.png',
  },
  {
    rel: 'apple-touch-icon',
    sizes: '192x192',
    href: '/favicon/favicon.png',
  },
  {
    rel: 'manifest',
    href: '/site.webmanifest',
  },
];

export default SeoHead;
