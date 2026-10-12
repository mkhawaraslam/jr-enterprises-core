# Invoices and Delivery Challans

## Setup

Apply `supabase/migrations/202610100002_sales_documents.sql` in the Supabase SQL Editor after the business, customer, product and quotation migrations (`202610080001` through `202610080006`). Apply `202610100001_customer_optional_fields.sql` first if it is still pending. Check that the selected project matches `NEXT_PUBLIC_SUPABASE_URL` locally and on Vercel. Do not rerun successful migrations. No database migration is applied automatically and no new environment variables are required.

The transactional migration creates shared `sales_documents`, `sales_document_items` and service-only numbering tables, enables RLS, adds read-only authenticated policies and service-only creation, and extends historical asset retention and business deletion guards. Apply this migration before deploying the application changes or running business cleanup.

## Workflow

- Invoices: `/admin/invoices`, `/admin/invoices/new`, `/admin/invoices/[id]`.
- Delivery challans: `/admin/delivery-challans`, `/admin/delivery-challans/new`, `/admin/delivery-challans/[id]`.
- Both modules support business filtering, reference/customer/PO search, pagination, creation and a PDF show page. The business filter is retained when starting a document. Customers and products remain shared across businesses.
- Searchable pickers allow selecting several products at once. Item descriptions and whole-number quantities can be adjusted without changing the catalogue. Invoices allow whole-number PKR unit prices; their total is the item subtotal only, with no tax or discount. Due dates are optional and must be on or after the invoice date.
- Challans contain quantities, a delivery address (initially the selected customer's saved address), project text, notes and an optional customer/PO reference. They have no unit prices, amounts, totals in currency or due dates. Prices are excluded from save payloads, not copied from the catalogue, null in storage, and omitted from read responses, accessible details and PDFs.
- Dates default to the current date in Pakistan. Limits match quotations: 100 items, quantities from 1 through 1,000,000, descriptions up to 500 characters, project text up to 500, and additional notes up to 5,000. Customer references allow 100 characters and delivery addresses 2,000. Invoice prices range from 0 through 2,147,483,647 and subtotal cannot exceed PKR 999,999,999,999. The database recomputes amounts and quantities.
- After applying `202610120001_numeric_document_references.sql`, new references are digits only: `3525`, `3526`, `3527`, and so on, separately for each business and type (quotation, invoice or challan). There is no yearly reset, `INV-`/`DC-` prefix, business code or date in the reference. Existing issued document numbers and PDFs stay unchanged. The migration seeds after any existing numeric references to avoid collisions. The plain stored reference flows unchanged into listings, PDFs, downloads and sharing.
- Service-only database insert triggers allocate from `document_reference_counters` atomically. Legacy RPC counters remain for compatibility, but their prefixed values are replaced before the document is inserted. Number allocation, source revision checks, snapshots and items commit together; failures roll back numbering too. Identical retries with the same request ID return the same document without consuming a second number; conflicting reuse is rejected.

Documents are immutable once issued, consistent with quotations. Editing, deletion, payment recording, stock accounting and automatic conversion from quotations are not included. A customer/PO reference can be used to record an associated quotation or invoice number without implying automatic linkage or payment status.

## Formats and PDFs

Each document uses the business's approved custom layout and detected logo accent. The existing versioned Industrial, Ledger, Minimal and Classic reference families are retained for historical compatibility. No built-in template selector has been added back to business forms. Apply `202610110001_business_document_layouts.sql`, then `202610110002_supplier_reference_layout.sql`, and use the per-business layout editor to compare all three PDF previews with the uploaded reference before approving a version. The inspected supplier reference uses renderer v2; historical v1 output stays unchanged. Replacing a file requires a new approval. A different design needs its own inspected mapping, not automatic reuse of the old layout. See `docs/DOCUMENT_LAYOUTS.md`. An arbitrary PDF or image is not automatically reproduced pixel-for-pixel.

The shared renderer adapts each mapped family to the document type. Invoices include invoice reference, issue date, optional due date, bill-to details, item rates/amounts, subtotal, business notes and authorized signature. They are labelled INVOICE, not tax invoice, and have no quotation validity or acceptance wording. Challans include delivery reference/date, recipient/delivery details, description and quantity columns, total quantity, business notes, authorized signature and received-by/signature/date lines. They contain no financial columns or quotation terms.

PDFs use immutable business/customer/item snapshots, logo/signature paths, format hash, layout version and accent rather than current directory values. Original assets remain protected after a business replaces its files. Output uses the mapped A4 or Letter page size, with repeated table headers, page numbers and multi-page notes. The actual PDF is rendered by PDF.js on mobile and desktop, with accessible text details underneath. Download, native file sharing and printing use this same file. PDFs are generated on demand, not saved to cloud storage.

Share PDF uses the native file share sheet when supported (choose WhatsApp). Otherwise it downloads the PDF and opens a customer WhatsApp chat; manual attachment is required because WhatsApp links cannot attach binary files. No private admin URL or public access token is shared. Printing opens the same PDF in a temporary frame, with a separate-tab fallback.

## Security and Deployment

Pages and APIs require a freshly verified Supabase session, remain noindex and private/no-store, and enforce no role restrictions yet. The privileged key stays server-only. Writes require same-origin JSON requests and bodies are limited to 512 KiB. Anonymous reads and writes, authenticated direct writes, and access to counter/fingerprint fields are revoked. Foreign keys protect businesses, customers and products referenced by issued documents. Business deletion checks documents before removing files; cleanup retains historical logos, signatures and reference files. Retained assets count toward Supabase Storage usage.

Keep Sharp's lazy CommonJS imports and optional native dependencies enabled on Vercel, as documented in `QUOTATIONS.md`. Redeploy after applying the migration. A missing-migration error is surfaced separately from PDF generation errors.

No automated test cases or refresh-button checks are added for this feature. Production compilation, local SQL verification and visual PDF/mobile review do not require writing to the live database.
