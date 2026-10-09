import { createHash } from "node:crypto";
import { isQuotationId, normalizeQuotation, validateQuotation } from "../../utils/adminQuotation";
import { readBusiness, signBusinessAssets } from "../businesses/server";
import { readCustomer } from "../customers/server";
import { businessQuotationLayout, downloadQuotationAsset, quotationLogoTheme } from "./assets";

export const quotationColumns = "id,business_id,customer_id,reference,date,valid_until,subject,notes,business_snapshot,customer_snapshot,layout_id,layout_version,format_hash,accent,total,created_at";
const unavailable = "Quotations are temporarily unavailable. Please try again.";
export class QuotationError extends Error {
  constructor(status, message, fields) { super(message); this.status = status; this.fields = fields; }
}
function databaseError(error) {
  if (error?.message === "quotation_source_changed") return new QuotationError(409, "A selected business, customer or product changed. Reselect the affected records before saving.");
  if (error?.message === "quotation_conflict") return new QuotationError(409, "This save conflicts with an existing quotation. Return to the quotation list before continuing.");
  return new QuotationError(503, unavailable);
}

export async function listQuotations(client, query) {
  const page = Number(query.page || 1); const business = query.business || null;
  if (!Number.isSafeInteger(page) || page < 1 || page > 1000000 || business && !isQuotationId(business) || query.search != null && typeof query.search !== "string") throw new QuotationError(400, "Invalid business filter, search or page.");
  const result = await client.rpc("list_quotations", { p_business_id: business, p_search: (query.search || "").trim().slice(0, 100), p_page: page });
  if (result.error || !Array.isArray(result.data?.items) || !Number.isSafeInteger(result.data?.count)) throw databaseError(result.error);
  return result.data;
}

export async function readQuotation(client, id) {
  if (!isQuotationId(id)) throw new QuotationError(404, "Quotation not found.");
  const result = await client.from("quotations").select(quotationColumns + ",items:quotation_items(position,product_id,product_name,description,quantity,price,amount)").eq("id", id).maybeSingle();
  if (result.error) throw databaseError(result.error);
  if (!result.data) throw new QuotationError(404, "Quotation not found.");
  return { ...result.data, items: result.data.items.sort((a, b) => a.position - b.position) };
}

export async function quotationBusiness(client, id) {
  const business = await readBusiness(client, id);
  if (business.deletion_pending) throw new QuotationError(409, "This business is pending deletion. Choose another business.");
  const { layout } = await businessQuotationLayout(client, business);
  const [signed] = await signBusinessAssets(client, [business]);
  return { ...signed, quotation_layout: layout };
}

export async function createQuotation(client, body, user) {
  if (!body || typeof body !== "object" || Array.isArray(body) || !isQuotationId(body.request_id)) throw new QuotationError(422, "Please check the quotation details.");
  const values = normalizeQuotation(body);
  const fields = validateQuotation(values);
  if (Object.keys(fields).length) throw new QuotationError(422, "Please check the highlighted fields.", fields);
  const id = body.request_id.toLowerCase();
  const fingerprint = createHash("sha256").update(JSON.stringify(values)).digest("hex");
  const prior = await client.from("quotations").select("id,request_fingerprint,created_by").eq("id", id).maybeSingle();
  if (prior.error) throw databaseError(prior.error);
  if (prior.data) {
    if (prior.data.request_fingerprint !== fingerprint || prior.data.created_by !== user.id) throw databaseError({ message: "quotation_conflict" });
    return { id };
  }
  const business = await readBusiness(client, values.business_id);
  const customer = await readCustomer(client, values.customer_id);
  if (business.deletion_pending || business.revision !== values.business_revision || customer.revision !== values.customer_revision) throw databaseError({ message: "quotation_source_changed" });
  const { layout, formatHash } = await businessQuotationLayout(client, business);
  if (!layout) throw new QuotationError(422, "This business's uploaded format needs a quotation layout mapping before it can be used.", { business_id: "The custom format has not been mapped yet." });
  const accent = await quotationLogoTheme(await downloadQuotationAsset(client, business.id, business.logo));
  const result = await client.rpc("create_quotation", { p_id: id, p_values: values, p_layout: { ...layout, format_hash: formatHash, accent }, p_fingerprint: fingerprint, p_actor: user.id });
  if (result.error || result.data !== id) throw databaseError(result.error);
  return { id };
}
