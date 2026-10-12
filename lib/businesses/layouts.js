import { createHash } from "node:crypto";
import { BusinessError, readBusiness, signBusinessAssets } from "./server";
import { downloadQuotationAsset, quotationLogoTheme, quotationPdfImages } from "../quotations/assets";
import { defaultBusinessLayout, layoutPreviewDocument, validateBusinessLayout } from "../../utils/businessLayout";
import { isBusinessId } from "./server";
import { renderQuotationPdf } from "../quotations/pdf";
import { currentBusinessLayout, layoutColumns, layoutDatabaseError } from "./layoutStore";
import { layoutMatchesReference, referenceLayout } from "./referenceLayouts";

export async function readLayoutEditor(client, id) {
  const business = await readBusiness(client, id);
  if (business.deletion_pending) throw new BusinessError(409, "This business is pending deletion.");
  if (business.billing_mode !== "custom" || !business.billing_format) throw new BusinessError(422, "Save a custom billing-format file for this business first.");
  const hash = createHash("sha256").update(await downloadQuotationAsset(client, id, business.billing_format)).digest("hex");
  const current = await currentBusinessLayout(client, business, hash);
  const history = await client.from("business_document_layouts").select(layoutColumns).eq("business_id", id).order("version", { ascending: false }).limit(10);
  if (history.error) throw layoutDatabaseError(history.error);
  const [signed] = await signBusinessAssets(client, [business]);
  const mapped = referenceLayout(hash);
  const currentMatches = current && layoutMatchesReference(current.definition, hash);
  return { business: signed, format_hash: hash, current, history: history.data,
    reference_mapping: mapped?.name || null, approval_required: !currentMatches,
    definition: currentMatches ? current.definition : mapped?.definition
      || (history.data[0]?.definition.schema === 1 && validateBusinessLayout(history.data[0].definition) ? history.data[0].definition : defaultBusinessLayout) };
}

export async function approveBusinessLayout(client, id, body, user) {
  if (!isBusinessId(body?.request_id) || body?.confirmation !== "approve-layout" || !validateBusinessLayout(body?.definition)
    || !Number.isSafeInteger(body?.revision) || body.revision < 1 || !/^[a-f0-9]{64}$/.test(body?.format_hash || "")) throw new BusinessError(422, "Check the layout settings and preview before approving.");
  const business = await readBusiness(client, id);
  if (business.deletion_pending || !business.billing_format || business.billing_mode !== "custom") throw new BusinessError(409, "Save the business and its custom billing-format file first.");
  const hash = createHash("sha256").update(await downloadQuotationAsset(client, id, business.billing_format)).digest("hex");
  if (hash !== body.format_hash) throw layoutDatabaseError({ message: "document_layout_changed" });
  if (!layoutMatchesReference(body.definition, hash)) throw new BusinessError(422, "This layout does not match the saved reference. Reopen the document layout.");
  const result = await client.rpc("approve_business_document_layout", { p_id: body.request_id, p_business_id: id,
    p_revision: body.revision, p_format_path: business.billing_format.path, p_format_hash: hash, p_definition: body.definition, p_actor: user.id });
  if (result.error) throw layoutDatabaseError(result.error);
  return result.data;
}

export async function previewBusinessLayout(client, id, body) {
  if (!validateBusinessLayout(body?.definition) || !["quotation", "invoice", "challan"].includes(body?.kind)) throw new BusinessError(422, "Check the document layout settings.");
  const business = await readBusiness(client, id);
  if (business.deletion_pending || business.revision !== body.revision) throw layoutDatabaseError({ message: "business_changed" });
  const hash = createHash("sha256").update(await downloadQuotationAsset(client, id, business.billing_format)).digest("hex");
  if (!layoutMatchesReference(body.definition, hash)) throw new BusinessError(422, "This layout does not match the saved reference. Reopen the document layout.");
  const accent = await quotationLogoTheme(await downloadQuotationAsset(client, id, business.logo));
  const document = layoutPreviewDocument(business, body.definition, body.kind, accent);
  return renderQuotationPdf(document, await quotationPdfImages(client, document), body.kind);
}
