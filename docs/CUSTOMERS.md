# Customers

## Setup

Apply `supabase/migrations/202610080004_customers.sql` once in the Supabase SQL Editor or through your migration workflow before deploying the updated application. The migration creates the customer directory, authenticated read policy and service-only write functions. It does not change existing businesses, quote requests or storage. The existing public Supabase URL/anon key and server-only `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`) are required. Never use `NEXT_PUBLIC_` for a privileged key.

Then apply `supabase/migrations/202610100001_customer_optional_fields.sql`. If the customer directory is already set up, apply only this new migration. It allows blank company names, emails and addresses while keeping name/phone requirements, existing records, permissions and revision checks unchanged. Missing values remain empty strings for compatibility with customer search and quotation snapshots. Apply it to each database used by local development or production before deploying the optional-field form.

Visit `/admin/customers`, or choose Customers in the sidebar. `/admin/dashboard?view=customers` redirects to the dedicated route. Pages and APIs require a freshly verified Supabase session and stay noindex and uncached. All verified workspace users can manage customers; no role restriction has been added. Keep public Auth sign-ups disabled for this private workspace.

## Fields

Only name and phone are required. Company name, email and address can be left blank; their labels do not include an optional suffix or required marker. Name and company name allow 150 characters each; email allows 254, phone 25 and address 1,000. Strings are trimmed and address line breaks are preserved. The UI and authenticated API validate email format when supplied and phone characters, including a minimum of seven digits. Empty email/company/address details are omitted from customer cards and details rather than showing empty links. There are no file uploads, Storage writes, automatic imports or sample customer records in the live directory.

Customers are shared across the workspace, not assigned to an individual business. Multiple contacts may belong to the same company; email and phone are not unique identifiers. Future quotations/invoices/challans can select both the business and customer explicitly. Do not use the shared-workspace read policy for a multi-tenant deployment without adding tenant-scoped access first.

## Directory and Actions

Search covers name, company, email, phone and address, with literal case-insensitive matching, a short debounce and 12 customers per page. Mobile/tablet layouts use readable cards with email/phone links, wrapped addresses and 44px controls. Desktop uses a table; any horizontal overflow remains inside it. Longer desktop address previews are shortened, while the detail view shows the full address. Forms use 16px mobile inputs, a single-column layout and sticky actions.

The eye icon opens customer details, the pencil opens editing and the trash icon opens a confirmation dialog identifying the customer and company. Cancel has initial focus in the delete dialog. Saving/deleting disables duplicate submission and dismissal until the operation finishes; errors keep the dialog open. Failed detail loading cannot turn an edit into a new customer. Session expiry sends the user to `/admin/login`.

## Data Safety

Only the authenticated server API writes via the server-only Supabase client. Browser database access is read-only; anonymous access is revoked. Mutation requests must be same-origin JSON and are limited to 32 KiB. The service-only save/delete functions lock the row and compare its revision, so stale edits/deletions cannot overwrite newer changes. Reload the customer after a conflict before trying again. Deleting an already removed customer is idempotent; deletion otherwise requires explicit confirmation and the current revision.

Deletion is permanent. When sales documents are implemented, add restrictive foreign keys for linked customers and snapshot customer billing details in issued documents. A foreign-key deletion failure is returned as a conflict instead of removing linked records. No billing-document generation, retention scheduler, role restrictions or automatic cascade deletion has been added by this feature.

No test cases or refresh-button checks were added for this implementation.
