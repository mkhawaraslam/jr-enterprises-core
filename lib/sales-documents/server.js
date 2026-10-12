import { createHash } from "node:crypto";
import { isQuotationId } from "../../utils/adminQuotation";
import { normalizeSalesDocument, salesDocumentType, validateSalesDocument } from "../../utils/adminSalesDocument";
import { readBusiness, signBusinessAssets } from "../businesses/server";
import { readCustomer } from "../customers/server";
import { businessQuotationLayout, downloadQuotationAsset, quotationLogoTheme } from "../quotations/assets";

const columns = "id,kind,business_id,customer_id,reference,date,due_date,customer_reference,delivery_address,subject,notes,business_snapshot,customer_snapshot,layout_id,layout_version,format_hash,accent,total,quantity_total,created_at";
export class SalesDocumentError extends Error {
  constructor(status, message, fields) { super(message); this.status = status; this.fields = fields; }
}
function databaseError(error) {
  if (error?.message === "document_layout_changed") return new SalesDocumentError(409, "The business format or approved layout changed. Reselect the business before saving.");
  if (error?.message === "sales_document_source_changed") return new SalesDocumentError(409, "A selected business, customer or product changed. Reselect the affected records before saving.");
  if (error?.message === "sales_document_conflict") return new SalesDocumentError(409, "This save conflicts with an existing document. Return to the document list before continuing.");
  if (["42P01", "42883", "PGRST202", "PGRST205"].includes(error?.code)) return new SalesDocumentError(503, "Invoice and delivery challan setup is incomplete. Apply the sales documents migration to this Supabase project.");
  return new SalesDocumentError(503, "Sales documents are temporarily unavailable. Please try again.");
}
export function requireDocumentType(kind) {
  const type = salesDocumentType(kind);
  if (!type) throw new SalesDocumentError(404, "Document type not found.");
  return type;
}
export async function listSalesDocuments(client, kind, query) {
  requireDocumentType(kind);
  const page = Number(query.page || 1); const business = query.business || null;
  if (!Number.isSafeInteger(page) || page < 1 || page > 1000000 || business && !isQuotationId(business) || query.search != null && typeof query.search !== "string") throw new SalesDocumentError(400, "Invalid business filter, search or page.");
  const result = await client.rpc("list_sales_documents", { p_kind: kind, p_business_id: business, p_search: (query.search || "").trim().slice(0, 100), p_page: page });
  if (result.error || !Array.isArray(result.data?.items) || !Number.isSafeInteger(result.data?.count) || result.data.count < 0) throw databaseError(result.error);
  return result.data;
}
export async function readSalesDocument(client, kind, id) {
  const type = requireDocumentType(kind);
  if (!isQuotationId(id)) throw new SalesDocumentError(404, type.name + " not found.");
  const result = await client.from("sales_documents").select(columns + ",items:sales_document_items(position,product_id,product_name,description,unit,quantity,price,amount)").eq("kind", kind).eq("id", id).maybeSingle();
  if (result.error) throw databaseError(result.error);
  if (!result.data) throw new SalesDocumentError(404, type.name + " not found.");
  // Quantity-only documents never expose financial fields, including in page props.
  const { total, ...document } = result.data;
  return { ...document, ...(type.priced ? { total } : {}), items: document.items.sort((a, b) => a.position - b.position).map(({ price, amount, ...item }) => type.priced ? { ...item, price, amount } : item) };
}
export async function salesDocumentBusiness(client, kind, id) {
  requireDocumentType(kind);
  const business = await readBusiness(client, id);
  if (business.deletion_pending) throw new SalesDocumentError(409, "This business is pending deletion. Choose another business.");
  const { layout } = await businessQuotationLayout(client, business);
  const [signed] = await signBusinessAssets(client, [business]);
  return { ...signed, document_layout: layout };
}
export async function createSalesDocument(client, kind, body, user) {
  const type = requireDocumentType(kind);
  if (!body || typeof body !== "object" || Array.isArray(body) || !isQuotationId(body.request_id)) throw new SalesDocumentError(422, "Please check the " + type.singular + " details.");
  const values = normalizeSalesDocument(kind, body);
  const fields = validateSalesDocument(kind, values);
  if (Object.keys(fields).length) throw new SalesDocumentError(422, "Please check the highlighted fields.", fields);
  const id = body.request_id.toLowerCase();
  const fingerprint = createHash("sha256").update(JSON.stringify({ kind, ...values })).digest("hex");
  const prior = await client.from("sales_documents").select("id,kind,request_fingerprint,created_by").eq("id", id).maybeSingle();
  if (prior.error) throw databaseError(prior.error);
  if (prior.data) {
    if (prior.data.kind !== kind || prior.data.request_fingerprint !== fingerprint || prior.data.created_by !== user.id) throw databaseError({ message: "sales_document_conflict" });
    return { id };
  }
  const business = await readBusiness(client, values.business_id);
  const customer = await readCustomer(client, values.customer_id);
  if (business.deletion_pending || business.revision !== values.business_revision || customer.revision !== values.customer_revision) throw databaseError({ message: "sales_document_source_changed" });
  const { layout, formatHash } = await businessQuotationLayout(client, business);
  if (!layout) throw new SalesDocumentError(422, "Approve this business's document layout before saving a document.", { business_id: "Open Configure layout, review the previews and approve the uploaded reference." });
  const accent = await quotationLogoTheme(await downloadQuotationAsset(client, business.id, business.logo));
  const result = await client.rpc("create_sales_document", { p_id: id, p_kind: kind, p_values: values, p_layout: { ...layout, format_hash: formatHash, accent }, p_fingerprint: fingerprint, p_actor: user.id });
  if (result.error || result.data !== id) throw databaseError(result.error);
  return { id };
}
