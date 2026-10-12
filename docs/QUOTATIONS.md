# Quotations

## Setup

Apply `supabase/migrations/202610080006_quotations.sql` after the business, customer and product migrations (0001 through 0005). The new migration creates quotation records, line items and per-business/year counters, then protects business assets referenced by saved documents. Apply it before deploying the corresponding cleanup changes. The existing public Supabase settings and server-only `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` are required. No migration is applied automatically by the application.

In Supabase SQL Editor, first verify the selected project matches the project reference in `NEXT_PUBLIC_SUPABASE_URL`. Local development and Vercel can use different projects; each intended database needs its own migration setup. For a database without the sales tables, execute these files individually in order:

1. `202610080001_businesses.sql`
2. `202610080002_business_notes_billing_format.sql`
3. `202610080003_business_document_templates.sql`
4. `202610080004_customers.sql`
5. `202610080005_products.sql`
6. `202610080006_quotations.sql`

Do not rerun migrations already successfully applied, rename unrelated tables, or drop existing data to resolve setup errors. A `relation "public.businesses" does not exist` error means that table is absent in the selected database; it does not indicate a quotation UI bug. Check the project selection before creating a second copy of your business directory in another project. This read-only query reports the base tables:

```sql
select
  to_regclass('public.businesses') as businesses,
  to_regclass('public.customers') as customers,
  to_regclass('public.products') as products;
```

A null result means the corresponding table is missing. If all base tables exist, also confirm the business profile upgrades (0002 and 0003) were applied. The quotation migration now checks prerequisites before creating any quotation objects and provides an actionable error/hint if setup is incomplete. Migration files are transactional; resolve the missing prerequisite and rerun the failed quotation migration, not the already successful ones.

`npm install` installs the pinned pdfmake, Sharp and PDF.js dependencies. Postinstall and prebuild copy the matching PDF.js module/worker and standard fonts/licenses to `public/vendor/pdfjs`; generated files are ignored by Git and must be deployed with the Next public directory. Node 22.3 or newer is required. No external CDN, browser PDF-generation service or new public storage bucket is used.

Sharp is required through its CommonJS entry only when extracting a logo colour or generating PDF images. This allows Next 12's tracer to follow the supported CommonJS dependency chain (including `dist/libvips.cjs` and the installed native libraries), rather than omitting files from Sharp's newer ESM layout. Listing and reading quotations do not load the native image library at startup. Keep optional npm dependencies enabled so the Linux Sharp/libvips packages are installed on Vercel. After a packaging change, deploy a new build; redeploy without the existing build cache if an old incomplete bundle persists. A missing `sharp/dist/libvips.mjs` module in Vercel logs is a deployment packaging failure, not a missing Supabase migration.

Routes are `/admin/quotations`, `/admin/quotations/new` and `/admin/quotations/[id]`. The old dashboard view redirects to the quotation list. Pages and APIs require a freshly verified Supabase session, remain noindex and uncached, and do not add role restrictions. Public Auth sign-up should remain disabled for the private workspace.

## Workflow

Customers and products remain shared across all businesses. Only the quotation list is filtered by business. The filter is retained in the URL and preselects the business when creating a quotation. Name/reference/customer search and pagination are available; mobile uses wrapped cards and 44px actions, while desktop uses a contained table.

Creation requires a business, customer, date, validity date and at least one product. Searchable paginated pickers support selecting several products at once. Descriptions, whole-number quantities and whole-number PKR unit prices can be adjusted for the quotation without changing the product catalogue. The default date is the current date in Pakistan; validity defaults to 15 days. Optional project/requirement text and additional notes are available. Business notes are included automatically. Mobile forms use 16px inputs, stacked fields and a sticky total/save bar.

Quantities must be 1 through 1,000,000; prices must be 0 through 2,147,483,647. Quotes support 100 items, descriptions up to 500 characters, project text up to 500 and additional notes up to 5,000. The total cannot exceed PKR 999,999,999,999. The total is the item subtotal only: there is no discount, tax, VAT or other charge. The database recalculates totals, rather than accepting a client total.

Apply `supabase/migrations/202610120001_numeric_document_references.sql` once after the quotation and sales-document migrations to enable numeric references. New quotations start at `3525`, then `3526`, `3527`, and so on, independently for each business and document type. The sequence continues across years; it does not reset. Numbers are stored as plain text digits and used unchanged in listings, PDFs, filenames and sharing, without `QT-`, `QTN-`, a business code or a year prefix. Existing issued references and PDFs remain unchanged. If numeric references already exist, the migration starts after their highest number (at least `3525`) to avoid reusing them.

Database insert triggers assign numbers atomically using the service-only `document_reference_counters` table, in the same transaction as snapshots and line items. The legacy RPC counters remain for compatibility but no longer determine the saved reference. Failed creations roll back the allocation. Repeated submission of the same request ID and payload returns the same saved quotation without allocating another number; mismatched reuse is rejected. Business/customer/product revisions are checked and locked before snapshotting, so a stale form cannot silently use changed directory data.

Saved quotations are immutable in this release. No edit/delete/status/conversion flow was requested or added. Snapshots retain the company and customer identity, item descriptions/names/prices, notes, template version and logo-derived accent. Future editing should be an explicit revision workflow, not an update to issued snapshots.

## Formats and PDF

Industrial, Ledger, Minimal and Classic reference v1 remain supported for previously issued documents. New custom formats require an approved per-business layout definition. Apply `202610110001_business_document_layouts.sql` after `202610100002_sales_documents.sql`, followed by `202610110002_supplier_reference_layout.sql`, then open the document-layout action for each business. The inspected J.R. Enterprises reference selects its own fingerprint-bound, Letter-size supplier mapping (renderer v2), not the generic configurable layout (v1). See `docs/DOCUMENT_LAYOUTS.md` for the approval workflow and limitations for different uploads.

The uploaded PDF/JPG/PNG is a reference, not an executable template. Adjust the bounded layout settings, compare the actual generated PDFs with the reference, review all three document types and explicitly approve. An approval is tied to both the immutable upload path and its SHA-256 hash. Replacing the file requires a new approval. Existing quotations retain their own layout definition, version, identity, accent and asset paths; issuing a new version never rewrites them. An arbitrary reference is not automatically replicated pixel-for-pixel, and no unapproved generic fallback is used.

The authenticated PDF endpoint uses the stored snapshot, not live directory values. pdfmake performs A4 layout for legacy/configurable formats and Letter layout for the inspected supplier reference, with repeated item-table headings, page numbers and full notes. Embedded Roboto font bytes are bundled in memory; supplier body text uses PDF's standard Times fonts, with local PDF.js font assets for consistent previews. Business images are checked, normalized and embedded by the server; the PDF generator cannot fetch arbitrary remote URLs or read arbitrary local files. Logo colour is detected from saturated pixels and darkened when necessary for white-text contrast; monochrome logos fall back to the application brand red.

The show page renders the actual generated PDF with PDF.js, with page navigation, fit-width and zoom modes. This is the same PDF used for downloading, sharing and printing. Accessible document details provide readable contact/item text outside the canvas. PDFs are generated on demand and are not uploaded or stored separately.

## Sharing and Printing

On browsers supporting file-based Web Share, the Share PDF button opens the native share sheet with the actual PDF file. The user chooses WhatsApp or another installed target; a website cannot force the target app. Cancellation is handled without an error notice. The file is preloaded before clicking so the share call retains browser user activation.

Where file sharing is unsupported, the button downloads the PDF and opens a WhatsApp chat with the customer's phone and a prepared message. The user must attach the downloaded file manually. WhatsApp URL links cannot attach a local binary PDF automatically, and no protected admin URL or publicly accessible customer document is shared. Pakistani local mobile numbers are normalized to +92; other valid international digit strings are preserved. Device/app/browser restrictions may still require manual download.

Print loads the same PDF in a temporary same-origin blob frame and invokes the browser's print dialog. If unavailable, the PDF opens separately for native PDF printing. The main admin chrome is not printed as the quotation. Blob URLs/frames are cleaned up when leaving the page.

## Retention and Security

Anonymous access is revoked. Authenticated browser database access is read-only. Only the same-origin JSON server API can create quotations with the privileged key; request bodies are limited to 512 KiB to accommodate 100 full descriptions and notes, including UTF-8 text. Numbering, snapshots, line items and totals are committed together. The service-only RPC and counters are not available to browser clients.

Foreign keys prevent deleting businesses/customers/products referenced by saved quotations. Business deletion checks for quotations before removing any cloud files. The cleanup API/script uses `business_asset_in_use` to retain replaced logos, signatures and format references still used by historical quotations. Their obsolete cleanup jobs are retired without deleting the files, so retained assets cannot block the queue. A storage read policy permits authenticated access to those historical assets. Referenced files remain in Supabase Storage and count toward its quota; immutable documents require retaining those original images. There is no automatic deletion schedule, public PDF share token or cloud PDF cache.

No test cases or refresh-button checks were added. Compilation, document rendering and responsive layout review are separate manual/static checks, not database writes. The migration must still be applied to enable live quotations.
