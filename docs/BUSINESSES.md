# Businesses

## Setup

Apply `supabase/migrations/202610080001_businesses.sql` once in the Supabase SQL Editor or your migration workflow, then restart/redeploy. It creates the business directory, private `business-assets` bucket, cleanup queue and service-only write functions. The existing public Supabase URL/anon key and server-only `SUPABASE_SECRET_KEY` (or legacy `SUPABASE_SERVICE_ROLE_KEY`) are required. Never prefix a privileged key with `NEXT_PUBLIC_`.

Then apply `supabase/migrations/202610080002_business_notes_billing_format.sql` once. If the first business migration is already applied, run only this second migration. It adds optional notes and billing-format metadata, permits PDF files in the private bucket, updates listing/save/deletion functions and extends storage permissions and cleanup paths. Existing records receive empty notes and no billing file. Apply the database upgrade before deploying the updated application.

Apply `supabase/migrations/202610080003_business_document_templates.sql` next. If both earlier migrations are already applied, run only this new migration. It stores the format source, template ID and version; existing businesses with an uploaded format are assigned Custom format, while others receive Industrial v1. Apply migrations in order before deploying the updated application.

Visit `/admin/businesses`. The previous `/admin/dashboard?view=business` link redirects there. All verified users can access the feature; roles remain unrestricted. Disable public Auth sign-ups for this private admin app. Pages/APIs stay noindex and uncached, with no new admin SEO tags.

## Fields and Files

Business name, NTN, email, phone, address, logo and signature are required. Special Notes and Instructions is an optional paragraph field limited to 5,000 characters; internal line breaks are preserved. Notes appear in the directory and business details; long directory previews are shortened, while details show the full text.

Document format offers Built-in template or Custom format. Built-in templates do not require an upload. Custom format requires one PDF, JPG or PNG file, which can be viewed or replaced when editing. To remove the only custom file, select Built-in template before saving. Merely switching to a built-in template does not delete a previously saved custom file; it stays stored but inactive. To explicitly remove it, mark it for removal while in Custom format, then choose Built-in template and save.

NTN is retained as entered (trimmed), not checked against a tax registry. PNG/JPG images retain their original colors/transparency. Each file is limited to 2 MiB; all newly selected uploads (logo, signature and billing format) are limited to 3 MiB combined. Existing unchanged files do not count toward this upload limit. File extensions, MIME, base64 and exact byte length are checked server-side. Images additionally validate actual format and dimensions, capped at 40 megapixels. PDFs validate their header and end marker; they are not fully parsed or scanned for malware. Only upload trusted billing formats.

The authenticated API receives files as base64 JSON within the configured 4.2 MiB body limit, below Vercel's 4.5 MB request-body limit. Files are uploaded server-side to versioned paths in a private Supabase bucket. Browser clients have no database/storage write permission. Image previews and billing-file links use five-minute signed URLs; reopen details after expiry.

Mobile uses a compact card directory, readable contact/address/notes fields and 44px controls. Desktop uses a table with a notes column; horizontal overflow stays inside the table on narrower screens. Search, pagination, refresh, details, creation, editing, file replacement/removal and confirmed deletion use real data, not prototype records.

## Document Templates

Industrial v1 (red letterhead), Ledger v1 (green split header) and Minimal v1 (monochrome) provide matching quotation, invoice and delivery-challan previews. Create/edit forms save the chosen family and version with the business. Details also show previews; browsing other designs there is read-only and never changes the saved choice. Quotation/invoice samples show PKR amounts; delivery challans show quantities without prices. The preview viewport scrolls internally on small screens so document text stays readable. Keyboard arrow/Home/End keys navigate the document tabs.

Previews use current business details and logo/signature, including newly selected local images before upload. Customers, items, dates, terms and amounts are clearly marked demo data, not issued documents. At most 600 characters of business notes are shown in previews; the full notes remain stored. A custom file is only a reference and is not automatically converted into an executable template. Built-in samples remain available for comparison when Custom format is selected.

Template definitions live in `utils/businessTemplates.js`; sample document layouts live in `components/Admin/BusinessDocumentPreview.js`. Do not replace a published ID/version layout with a redesign: add a new catalog version and expand the database constraint instead. A saved business keeps its chosen version until explicitly changed. Saved quotations and their PDFs are implemented separately; see `docs/QUOTATIONS.md` and apply migration `202610080006_quotations.sql`. Invoice and challan issuance remains future work. Quotations snapshot business details, notes, assets, colours and template versions so profile edits do not change issued documents.

## Saves and Deletion

Editing uses a revision number and atomic database save; a stale edit cannot overwrite another user's changes. Cleanup paths are reserved before upload, so interrupted saves can be swept after one hour. Current business files are kept until the replacement/removal and database save succeed. Successful saves remove replacement reservations and queue superseded or removed files transactionally. The API immediately attempts removal of due retired files; failures retain a durable cleanup record.

Deletion requires confirmation, leases the business for two minutes, removes its stored logo/signature/billing format through Supabase Storage, then deletes the row. Storage/DB failure retains the business and locks edits; Retry deletion completes the same operation. Already removed files cannot be recovered. The database lock prevents concurrent editing/deletion. If the operation is interrupted while holding a lease, wait two minutes and retry. Existing signed previews/cache entries can remain available until expiry.

Run `npm run businesses:cleanup` for a read-only dry run. `npm run businesses:cleanup -- --execute` processes up to 100 due cleanup entries, refuses invalid paths, skips files still referenced by a business or saved quotation, and removes files before cleanup records. Quotation-linked businesses cannot be deleted, and historical document assets continue to count toward storage. The API and cleanup worker fail closed if the reference check is unavailable. Apply the quotation migration before deploying this cleanup upgrade. Run cleanup periodically using a trusted scheduler and monitor failures and Supabase Storage usage. No scheduler or age-based business deletion is configured by this implementation. Do not run destructive checks against genuine customer/company data.
