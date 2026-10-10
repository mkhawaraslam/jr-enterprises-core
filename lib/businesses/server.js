import { randomUUID } from "node:crypto";
import { imageSize } from "image-size";
import { BUSINESS_ASSET_BUCKET, BUSINESS_IMAGE_LIMIT, normalizeBusiness, validateBusiness } from "../../utils/adminBusiness";
import { normalizeBillingPreference } from "../../utils/businessTemplates";

export const businessColumns = "id,name,ntn,email,phone,address,special_notes,logo,signature,billing_format,billing_mode,template_id,template_version,revision,created_at,updated_at,deletion_pending";
const unavailable = "Business management is temporarily unavailable. Please try again.";
const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
export const isBusinessId = (id) => typeof id === "string" && new RegExp("^" + uuid + "$", "i").test(id);
export const isBusinessAssetPath = (path, id) => typeof path === "string" && new RegExp("^" + (id || uuid) + "/" + uuid + "/(?:(?:logo|signature)\\.(?:png|jpg)|billing-format\\.(?:pdf|png|jpg))$", "i").test(path);

export class BusinessError extends Error {
  constructor(status, message, fields) { super(message); this.status = status; this.fields = fields; }
}

function databaseError(error) {
  if (error?.message === "business_has_quotations" || error?.code === "23503") return new BusinessError(409, "This business has saved quotations and cannot be deleted.");
  if (error?.message === "business_not_found") return new BusinessError(404, "Business not found.");
  if (error?.message === "business_changed") return new BusinessError(409, "This business changed while you were editing. Reload it before trying again.");
  if (["deletion_pending", "deletion_busy"].includes(error?.message)) return new BusinessError(409, "Deletion is pending. Wait two minutes, then retry deletion.");
  return new BusinessError(503, unavailable);
}

function revision(value) {
  if (!Number.isSafeInteger(value) || value < 1) throw new BusinessError(422, "Reload the business before continuing.");
  return value;
}

export async function readBusiness(client, id) {
  if (!isBusinessId(id)) throw new BusinessError(404, "Business not found.");
  const result = await client.from("businesses").select(businessColumns).eq("id", id).maybeSingle();
  if (result.error) throw databaseError(result.error);
  if (!result.data) throw new BusinessError(404, "Business not found.");
  return result.data;
}

export async function signBusinessAssets(client, records) {
  const paths = [...new Set(records.filter((record) => !record.deletion_pending).flatMap((record) => [record.logo, record.signature, record.billing_format].filter((asset) => isBusinessAssetPath(asset?.path, record.id)).map((asset) => asset.path)))];
  const urls = new Map();
  if (paths.length) {
    const signed = await client.storage.from(BUSINESS_ASSET_BUCKET).createSignedUrls(paths, 300);
    if (!signed.error) for (const asset of signed.data || []) if (asset.signedUrl && !asset.error) urls.set(asset.path, asset.signedUrl);
  }
  return records.map((record) => ({ ...record, logo: { ...record.logo, url: urls.get(record.logo?.path) || null }, signature: { ...record.signature, url: urls.get(record.signature?.path) || null }, billing_format: record.billing_format ? { ...record.billing_format, url: urls.get(record.billing_format.path) || null } : null }));
}

export async function listBusinesses(client, query) {
  const page = Number(query.page || 1);
  if (!Number.isSafeInteger(page) || page < 1 || page > 1000000 || (query.search != null && typeof query.search !== "string")) throw new BusinessError(400, "Invalid search or page.");
  const result = await client.rpc("list_businesses", { p_search: (query.search || "").trim().slice(0, 100), p_page: page });
  if (result.error || !Array.isArray(result.data?.items)) throw databaseError(result.error);
  return { ...result.data, items: await signBusinessAssets(client, result.data.items) };
}

function decodeFile(file, slot) {
  if (typeof file.content !== "string" || file.content.length > Math.ceil(BUSINESS_IMAGE_LIMIT / 3) * 4 || !/^[A-Za-z\d+/]+={0,2}$/.test(file.content)) throw new BusinessError(422, "Please select the files again.", { [slot]: "The file could not be read." });
  const bytes = Buffer.from(file.content, "base64");
  if (bytes.length !== file.size || bytes.toString("base64") !== file.content) throw new BusinessError(422, "Please select the files again.", { [slot]: "File size does not match the selected file." });
  if (slot === "billingFormat" && file.type === "application/pdf") {
    if (!/^%PDF-(?:1\.[0-7]|2\.0)(?:\r|\n)/.test(bytes.subarray(0, 16).toString("ascii")) || !/%%EOF\s*$/.test(bytes.subarray(-1024).toString("ascii"))) throw new BusinessError(422, "Please select a valid PDF.", { billingFormat: "The PDF header or end marker is missing." });
    return bytes;
  }
  let dimensions;
  try { dimensions = imageSize(bytes); } catch { throw new BusinessError(422, "Please select valid JPG or PNG images.", { [slot]: "The image could not be opened." }); }
  if (dimensions.type !== (file.type === "image/png" ? "png" : "jpg") || !dimensions.width || !dimensions.height || dimensions.width * dimensions.height > 40000000) throw new BusinessError(422, "Please select valid JPG or PNG images.", { [slot]: "Only JPG/PNG images up to 40 megapixels are accepted." });
  return bytes;
}

async function removeRetiredAssets(client, id) {
  const queued = await client.from("business_asset_cleanup").select("path,run_after").like("path", id + "/%").lte("run_after", new Date().toISOString()).limit(20);
  if (queued.error) return false;
  const candidates = queued.data || [];
  const paths = [];
  for (const entry of candidates) {
    if (!isBusinessAssetPath(entry.path, id)) return false;
    const active = await client.rpc("business_asset_in_use", { p_path: entry.path });
    if (active.error || typeof active.data !== "boolean") return false;
    if (!active.data) paths.push(entry.path);
    else {
      // Retain the file, but retire its stale job so later unused files can be cleaned.
      const retired = await client.from("business_asset_cleanup").delete().eq("path", entry.path).eq("run_after", entry.run_after);
      if (retired.error) return false;
    }
  }
  if (paths.some((path) => !isBusinessAssetPath(path, id))) return false;
  if (!paths.length) return true;
  const removed = await client.storage.from(BUSINESS_ASSET_BUCKET).remove(paths);
  if (removed.error) return false;
  const deleted = await client.from("business_asset_cleanup").delete().in("path", paths);
  return !deleted.error;
}

export async function saveBusiness(client, id, body, user) {
  if (!body || typeof body !== "object" || Array.isArray(body) || (body.images != null && (typeof body.images !== "object" || Array.isArray(body.images))) || Object.keys(body.images || {}).some((slot) => !["logo", "signature"].includes(slot))) throw new BusinessError(422, "Please check the business details.");
  if ((body.billingFormat != null && (typeof body.billingFormat !== "object" || Array.isArray(body.billingFormat))) || (body.removeBillingFormat !== undefined && typeof body.removeBillingFormat !== "boolean") || (body.billingFormat && body.removeBillingFormat)) throw new BusinessError(422, "Please check the billing format.");
  const previous = id ? await readBusiness(client, id) : null;
  if (previous?.deletion_pending) throw new BusinessError(409, "Deletion is pending. Retry deletion before making changes.");
  const expected = previous ? revision(body.revision) : null;
  if (previous && previous.revision !== expected) throw new BusinessError(409, "This business changed while you were editing. Reload it before trying again.");
  const images = body.images || {};
  const values = normalizeBusiness({ ...body, ...normalizeBillingPreference({ ...previous, ...body, billing_mode: "custom" }) });
  const fields = validateBusiness(values, images, previous, body.billingFormat, body.removeBillingFormat);
  if (Object.keys(fields).length) throw new BusinessError(422, "Please check the highlighted fields.", fields);
  const buffers = {};
  const files = { ...images, ...(body.billingFormat ? { billingFormat: body.billingFormat } : {}) };
  for (const slot of Object.keys(files)) if (files[slot]) buffers[slot] = decodeFile(files[slot], slot);
  const businessId = id || randomUUID();
  const version = randomUUID();
  const assets = { logo: previous?.logo, signature: previous?.signature, billingFormat: body.removeBillingFormat ? null : previous?.billing_format || null };
  const freshPaths = [];
  for (const slot of Object.keys(buffers)) {
    const file = files[slot];
    const extension = file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg";
    const path = `${businessId}/${version}/${slot === "billingFormat" ? "billing-format" : slot}.${extension}`;
    assets[slot] = { path, name: file.name.replace(/[\x00-\x1f\x7f/\\]/g, "_").slice(0, 200), mime_type: file.type, size: file.size };
    freshPaths.push(path);
  }
  // Reserve cleanup before uploading, so interrupted saves leave recoverable paths.
  if (freshPaths.length) {
    const queued = await client.from("business_asset_cleanup").insert(freshPaths.map((path) => ({ path, run_after: new Date(Date.now() + 60 * 60 * 1000).toISOString() })));
    if (queued.error) throw databaseError(queued.error);
  }
  for (const slot of Object.keys(buffers)) {
    const upload = await client.storage.from(BUSINESS_ASSET_BUCKET).upload(assets[slot].path, buffers[slot], { contentType: files[slot].type, upsert: false });
    if (upload.error) throw new BusinessError(503, "The files could not be uploaded. Your existing business details have not changed.");
  }
  const saved = await client.rpc("save_business", { p_id: businessId, p_values: values, p_logo: assets.logo, p_signature: assets.signature, p_billing_format: assets.billingFormat, p_revision: expected, p_actor: user.id });
  if (saved.error || saved.data !== businessId) throw databaseError(saved.error);
  let cleanupComplete = false;
  try { cleanupComplete = await removeRetiredAssets(client, businessId); } catch { /* The durable queue retains files for maintenance. */ }
  return { id: businessId, cleanupPending: !cleanupComplete };
}

export async function deleteBusiness(client, id, body) {
  if (!isBusinessId(id)) throw new BusinessError(404, "Business not found.");
  if (body?.confirmation !== "delete-business") throw new BusinessError(422, "Confirm deletion before continuing.");
  const expected = revision(body.revision);
  const token = randomUUID();
  const claimed = await client.rpc("claim_business_deletion", { p_id: id, p_revision: expected, p_token: token });
  if (claimed.error) throw databaseError(claimed.error);
  if (!claimed.data) return { id, deleted: true };
  try {
    const paths = [claimed.data.logo?.path, claimed.data.signature?.path, ...(claimed.data.billing_format ? [claimed.data.billing_format.path] : [])];
    if (paths.some((path) => !isBusinessAssetPath(path, id))) throw new BusinessError(503, "The stored file paths could not be verified. The business was not deleted.");
    const removed = await client.storage.from(BUSINESS_ASSET_BUCKET).remove(paths);
    if (removed.error) throw new BusinessError(503, "Files could not be removed. The business is retained; retry deletion.");
    const finished = await client.rpc("finish_business_deletion", { p_id: id, p_token: token });
    if (finished.error || finished.data !== true) throw new BusinessError(503, "Deletion could not finish. Retry deletion to complete it.");
    return { id, deleted: true };
  } catch (error) {
    try { await client.rpc("release_business_deletion", { p_id: id, p_token: token }); } catch { /* The lease expires after two minutes. */ }
    throw error;
  }
}
