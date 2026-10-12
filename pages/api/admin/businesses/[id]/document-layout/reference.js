import { layoutFileHandler } from "../../../../../../lib/businesses/layoutApi";
import { BusinessError, readBusiness } from "../../../../../../lib/businesses/server";
import { downloadQuotationAsset } from "../../../../../../lib/quotations/assets";

export default layoutFileHandler("GET", async (client, req) => {
  const business = await readBusiness(client, req.query.id);
  const asset = business.billing_format;
  if (business.deletion_pending || !asset || !["application/pdf", "image/jpeg", "image/png"].includes(asset.mime_type)) throw new BusinessError(404, "Billing-format reference not found.");
  return { bytes: await downloadQuotationAsset(client, business.id, asset), type: asset.mime_type, name: "billing-reference." + ({ "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png" })[asset.mime_type] };
});
