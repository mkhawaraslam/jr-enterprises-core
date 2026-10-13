# Custom Document Layouts

## Deployment

Apply `supabase/migrations/202610110001_business_document_layouts.sql` once, after `202610100002_sales_documents.sql` and its prerequisites, to the Supabase project configured in Vercel. Deploy the corresponding application code. The application does not run migrations automatically. No production data or storage files are modified by local implementation/verification.

Then apply `supabase/migrations/202610110002_supplier_reference_layout.sql` for the inspected J.R. Enterprises supplier reference. Redeploy, reopen its document-layout page and approve the three new previews. Existing schema-1 approvals for this reference are not reused for new documents; already-issued documents are unchanged.

The old single-file SHA-256 whitelist is removed. Existing issued documents still use their original published renderer. Custom businesses, including ones whose reference formerly matched the whitelist, need to approve their first database-backed layout before creating new documents. No existing documents are migrated, redesigned or deleted.

## Workflow

1. Save the business and its required PDF/JPG/PNG billing-format reference.
2. Open the document-layout icon in Businesses, or Configure layout from a document's business selection.
3. Adjust letterhead, title position/size, logo width, page margins, text size, recipient column, table heading/borders/stripes/spacing, notes, signature placement and footer. Accent colors come from the business logo.
4. Compare the Uploaded reference tab with the actual server-generated PDFs. Preview quotation, invoice and delivery challan, then confirm approval and select Approve for future documents.
5. Return to the document form and select Check approval. Existing entered customer/items remain in that form; the editor opens in a separate tab from there.

The same approved style applies to all three document types, with their different content rules: quotations include validity and acceptance; invoices use item subtotals only; challans include quantities and receipt signatures, with no prices or totals. Preview records contain visibly marked demo customer/items and are never saved as issued documents.

All document templates and template previews display `CEO JAVAID IQBAL` immediately above the business address. The heading is shared through `businessCeoHeading` in `utils/businessTemplates.js` and does not modify the stored address.

Replacing the uploaded reference creates a new immutable storage path, automatically leaving the new file pending approval. The previous definition can be used as an editing starting point but is not silently activated for the replacement. Approval creates the next version for that business, and also increments its business revision so already-open create forms must reselect current data.

This is a bounded layout-mapping editor, not an automatic PDF/image-to-template converter or a freeform coordinate editor. Unusual reference artwork, arbitrary overlapping fields or radically different page structures may need a new renderer capability. Do not approve a preview that does not match the intended design. No OCR, external AI upload or execution of uploaded documents is involved.

## Inspected Supplier Reference

The uploaded J.R. Enterprises file is a one-page Letter-size supplier quotation. `lib/businesses/referenceLayouts.js` binds its SHA-256 fingerprint to `supplier-grid-v1`; a filename or business name alone never selects this mapping. The `custom-mapped` version-2 renderer in `utils/supplierReferenceDocument.js` reproduces its serif body text, logo/name letterhead, boxed customer panel, colored title/metadata panel, serial/description/unit/quantity/rate/amount grid, notes beside subtotal, right-side business signature and ruled thank-you footer. Only size, spacing and footer settings are adjustable; generic layout controls cannot replace its structural mapping.

Business identity, contacts, signature, logo-derived accent, customer, dates and items come from actual document snapshots. The original sample company's identity, customer, tax and prices are not copied. Invoices remain subtotal-only and challans omit monetary columns and show receipt fields. Units are shown as `-` when not recorded; the renderer does not invent units. Longer content flows to additional pages with repeated item headings and page numbers.

`scripts/sync-pdfjs.cjs` also bundles PDF.js standard-font files and their licenses during install/build. The viewer loads these locally rather than depending on a device's installed fonts. PDF serverless traces must include PDFKit's four Times AFM files; no arbitrary file or URL access is permitted by the renderer.

Replacing the reference with a different file does not transfer this mapping automatically. A different design needs its own inspected mapping. Unmapped files explicitly identify their preview as configurable rather than an automatic recreation. No source PDFs, business data, logo images or signatures are committed to the repository.

The recreated J.R. Enterprises business uses a different Letter-size quotation reference, mapped by SHA-256 `e783a62de36c63dfbb888c1967fadeaa6874e151671d821c5fbc3b5551c37e62` to `letterhead-grid-v1`. Apply `202610110004_letterhead_reference_layout.sql` after the prior document-layout migrations before approving this reference. `utils/letterheadReferenceDocument.js` recreates the broad logo/name letterhead, right-aligned contacts and colored document banner, connected customer/metadata panel and ruled item grid, notes alongside subtotal, right-hand signature and bottom document footer. It uses the saved business identity, never the source supplier's logo or contact details. Invoices remain subtotal-only; delivery challans contain no prices. Approval remains scoped to the current business and immutable upload path, so a recreated business must review and approve its three previews. Previously issued documents retain their existing mapping.

### J.R. Enterprises Header

The `letterhead-grid-v1` presentation keeps the original company name beside its logo and address, phone, email and NTN on the right. `www.jrenterprisespk.com` appears immediately below NTN for J.R. Enterprises, including punctuation/case variants of its name; this contact fallback never selects a reference mapping or adds J.R.'s website to another business. A compact black, bold Customer: heading sits immediately above the customer box, aligned with its left edge and separated by only one point. These presentation corrections also apply when rendering existing version-2 snapshots; document numbers, stored data and approvals are not rewritten. Reopen the layout page to see them without selecting another header preset.

The superseded below-logo header controls are removed. Existing optional `letterhead` definitions remain readable, and any saved website is retained on the right, but the company name always uses the original beside-logo position. `202610120002_brand_letterhead.sql` remains available for deployments that already saved this optional definition. The standard nine-field layout does not need that migration for the website/Customer-label correction.

For J.R. Enterprises invoices using this letterhead, Payment Instructions appear below the notes/subtotal on the left, opposite the signature, following the supplied `Quote-3237.pdf` reference. The bank is UBL, account number `1632394994329`, account title `JR ENTERPRISES`. The block stays with the signature when a document runs to another page. It is omitted from quotations, delivery challans and other businesses' invoices.

Downloads, native file sharing, WhatsApp download fallback and PDF response filenames use the same `salesDocumentFilename` formatter: `quote-3525.pdf`, `invoice-3525.pdf` and `delivery-challan-3525.pdf`. Legacy document-type prefixes are replaced for filenames only; the rest of the reference, including historical business/year identifiers, remains intact. Stored and printed document numbers do not change.

## Persistence and Security

`business_document_layouts` stores immutable, numbered, data-only definitions with the business ID, immutable reference path, SHA-256 hash, approver and time. The latest approval matching the current path/hash is used. Browser clients have authenticated read-only access; approval writes use a same-origin JSON endpoint, fresh Supabase authentication and a service-only transactional RPC. No role restrictions were added. Routes and binary previews remain noindex and private/no-store.

Approval locks the business, verifies its revision/reference, and supports idempotent retries by request UUID. A replacement or concurrent approval invalidates stale forms. Database insert triggers snapshot the approved definition and business layout version into each quotation/invoice/challan while the creation RPC holds the business lock. Later approvals cannot alter an issued document's PDF because rendering reads its snapshot, not the current layout table.

Legacy layout IDs and `custom-mapped` version 1 stay supported without changing their designs. The inspected supplier mapping uses `custom-mapped` version 2 and definition schema 2. Future renderer redesigns must add a new renderer version, not change historical behavior in place.

Only current or issued-document-referenced assets remain protected by existing storage-retention rules. Layout history by itself does not retain an otherwise unused old reference file; its definition/hash remain available as audit metadata. No generated PDF is stored in Supabase, and replacing a template does not make extra cloud PDF copies. Businesses with issued documents still cannot be deleted.

No test cases or refresh-button checks were added. Build, disposable-database checks and manual responsive/PDF review are used for verification.
