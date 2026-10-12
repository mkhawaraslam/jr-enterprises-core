# Products

## Setup

Apply `supabase/migrations/202610080005_products.sql` once in the Supabase SQL Editor or through the migration workflow before using the feature. It creates the product table, authenticated read policy and service-only write functions; it does not modify the public catalogue, other workspace records or Storage. Existing Supabase URL/anon key and server-only `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`) are required.

Before deploying the unit field, apply `supabase/migrations/202610110003_product_units.sql` once after the product, quotation and sales-document migrations. It adds units to products and snapshots them on new billing-document items. Existing products default to `NOS`; review any products sold by metre or foot and change their units as appropriate. Historical document items retain a null unit because their original unit is unknown.

Visit `/admin/products` or choose Products in the sidebar. `/admin/dashboard?view=products` redirects to this dedicated page. Routes and APIs require a freshly verified Supabase session and inherit admin noindex/no-store protection. All authenticated workspace users can manage products; no role restrictions were added. Keep public Auth sign-ups disabled for this private workspace.

## Fields and Directory

Name, price and unit are required. Units are selected from `NOS` (pieces), `MTR` (metres) and `FT` (feet); the form starts with `NOS`. The API and database both validate the allowed units. Names allow 150 characters and are trimmed. Prices use PKR, matching the existing sales workspace, with no decimals. Zero is allowed; negative, fractional, exponential and nonnumeric input are rejected. The maximum is PKR 2,147,483,647, matching the database integer type. Browser inputs use a numeric mobile keyboard; the API validates prices before converting them to integers. The service-only database save function rejects decimal values before casting them, avoiding implicit rounding.

Products are shared across the workspace, not tied to one business. No uniqueness restriction is applied to product names. There are no image uploads, categories, stock quantities, automatic public catalogue updates or sample records in the live product directory.

The directory provides literal case-insensitive name search and 12 products per page. Mobile/tablet layouts use readable cards with wrapped names, prices, units and 44px view/edit/delete controls. Desktop uses a table with a Unit column and contained horizontal scrolling. Forms use 16px mobile inputs, a single-column mobile layout and sticky actions. Loading, empty, validation, success and API-error states are included.

## Data Safety

Anonymous database access is revoked. Authenticated users have read-only access to safe columns; only the authenticated server API writes with the server-only Supabase key. Mutations require same-origin JSON and are limited to 32 KiB. Database save/delete functions lock the row and compare its revision to reject stale changes. Failed detail loading cannot turn an edit into creation. Duplicate submissions and dismissal are disabled while saving/deleting; conflicts require reloading the record. Session expiry redirects to sign-in.

Deletion requires a named confirmation and the current revision. Cancel receives initial focus. Deletion is permanent and idempotent if another user already removed the record. Restrictive product foreign keys protect issued documents. Database insert triggers copy the authoritative product unit onto new quotation, invoice and delivery-challan items under a product lock; a later product edit does not change issued documents. Historical items are not backfilled, and their previous PDF table layout is preserved. This feature does not cascade-delete or alter billing records. Foreign-key delete failures surface as a conflict.

No test cases or refresh-button checks were added for this implementation.
