# Landing Page SEO and GEO

This project uses Next.js 12 **Pages Router**, not App Router. `components/SeoHead.js` renders metadata and a single JSON-LD graph with `next/head`. The visible company content and FAQ answers are present in server-rendered HTML. At the user's request, the introductory "Industrial Valves & Automation in Pakistan" block and "How can we support your industrial requirements?" section are no longer rendered on the homepage; their source data and SEO metadata remain intact.

## Sources of Truth

- `data/site.json`: default production origin, 57-character title, 158-character description, social image and its actual dimensions.
- `data/business.json`: company identity, founding year, phone, email, Multan address and verified social profiles. `data/business.cjs` provides Node-compatible access for the contact module.
- `data/landingContent.json`: retained 42-word SEO summary, product selection guidance, quotation checklist, visible FAQs and their structured answers. The summary remains the `CollectionPage.description`; the guidance and checklist remain available to the retained, unmounted `ProductGuide` component.
- `data/productCollections.json`: ten visible image-only industrial product collections and their structured names, descriptions, and images.
- `utils/seo.js`: canonical URLs, indexing policy, JSON-LD graph, safe script serialization, sitemap and robots generation.

## Production Configuration

1. In Vercel, set `NEXT_PUBLIC_SITE_URL=https://www.jrenterprisespk.com` for Production. The default already matches the site's apex-to-www redirect. Remove any older `vercel.app` value, then redeploy; public environment values are baked into the build.
2. Keep `NEXT_PUBLIC_NOINDEX=false` for Production. `next.config.js` exposes Vercel's `VERCEL_ENV` to the metadata component so preview deployments use `noindex, follow`; the generator uses the same environment. For staging hosted elsewhere, set `NEXT_PUBLIC_NOINDEX=true` explicitly, not on Production.
3. `npm run build` automatically runs `seo:export`. It generates `public/robots.txt`, `public/sitemap.xml`, and the copy-ready `docs/structured-data.json` / `docs/structured-data.html` from the same data as the live page. Next loads `.env` files for the app; the standalone generator also loads them through `@next/env` so these files use the same origin and policy. Run `npm run seo:export` after changing SEO content for a static preview or documentation refresh.
4. Check the deployed page's source for one title, description, canonical, charset, viewport and JSON-LD script. Confirm the canonical, `og:url`, sitemap and schema URLs agree. Verify the favicon and social image return HTTP 200.
5. Add the domain property to Google Search Console, verify ownership using the DNS TXT record it provides, and submit `https://www.jrenterprisespk.com/sitemap.xml`. Inspect the homepage and request indexing after deployment. Add Bing Webmaster Tools verification as appropriate. Account setup and DNS verification are not performed by this implementation.
6. Keep alternate domains and the root domain redirecting to the chosen www origin in Vercel. Redirects and domain ownership are deployment settings, not client-side code.

Preview robots files omit sitemap discovery, and preview sitemaps contain no indexable URLs. Crawling remains allowed so bots can read the `noindex` directive; `noindex` is not access control. Protect private previews with Vercel authentication.

## Structured Data

The graph contains `WebSite`, `Organization`, `CollectionPage`, `ItemList`, ten `ProductCollection` nodes, and `FAQPage`. All FAQ answers match the visible page exactly. Product URLs reference actual collection IDs on the landing page.

`ProductCollection` is a [Schema.org subtype of Product](https://schema.org/ProductCollection), appropriate for these catalogue collages. This is an industrial supplier, not a software application. There are no invented operating systems, SKUs, stock statuses, prices, reviews or aggregate ratings.

There is deliberately no `SearchAction`: the user chose a catalogue without search. `sameAs` is omitted until actual official social-profile URLs are supplied; the company domain is the website URL, not a social profile. Populate `socialProfiles` with verified public profile URLs when available.

No numeric `offers` are published because this business uses quotations. A zero price would incorrectly mean free. This catalogue graph does **not** claim eligibility for Google's individual-product price/review rich results. Add separate product pages with genuine, visible pricing or verified reviews before implementing those features. See [Google product structured data requirements](https://developers.google.com/search/docs/appearance/structured-data/product-snippet).

FAQ markup supplies machine-readable answers; it does not promise FAQ rich results. Do not add a second copy of the exported script to the page: `SeoHead` already injects the graph.

## Content and Performance

The page has one H1 on the existing company heading, question-based H2/H3 headings, image-only product collections and accessible native FAQ disclosures. The intro summary and product guide/table/checklist are not rendered, and are not replaced with hidden or screen-reader-only SEO blocks. The factual SEO description remains consistent with the visible company content. FAQs are not hidden behind animation. Header navigation has real fragment URLs and keyboard focus states; the page uses `header`, `main`, `section`, and `footer` landmarks.

Hero images reserve their layout using explicit responsive dimensions; catalogue collages use fixed aspect-ratio containers. Logos have reserved-size containers, descriptive alt text on originals, and decorative duplicate images with empty alt text. Below-the-fold logos load lazily. The social preview uses the existing real industrial photo (1345 x 900) rather than an upscaled small logo. No additional image or animation library is installed.

Measure real Core Web Vitals after deployment in Search Console/PageSpeed Insights, especially on mobile. This implementation reserves image space but does not assert a Lighthouse score or field LCP/INP/CLS result. The existing remote client-logo hosts remain external dependencies.

Google's [AI search guidance](https://developers.google.com/search/docs/appearance/ai-features) recommends normal crawlable, helpful content and consistent structured data. There is no special schema or AI text file required for AI Overviews. Indexing, rankings, rich results and AI citations are not guaranteed. Maintain accurate product specifications and genuinely useful answers as the business evolves.

The quotation dialog remains UI-only. Public FAQ instructions direct enquiries to the working WhatsApp/email links, not an unconnected backend.

## Verification

```sh
node --test tests/*.test.cjs
node --experimental-default-type=module --test tests/quote-request.test.mjs tests/scroll-animation.test.mjs
npm run seo:export
npm run build
```

Use Schema.org's validator to inspect the full graph and Google's Rich Results Test for supported search appearances. Search Console remains the authority for indexing status after deployment.
