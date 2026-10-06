import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { imageSize } from "image-size";
import { createQuoteRequest, MAX_QUOTE_IMAGE_SIZE, QUOTE_PHOTO_BUCKET, validateQuoteRequest } from "../../utils/quoteRequest";

export const quoteColumns = "id,full_name,phone,email,requirements,photos,submitted_at,reviewed_at,reviewed_by,photos_removed_at,cleanup_action";
export const quoteUnavailable = "Quote requests are temporarily unavailable. Please try again later.";
export const isQuoteId = (id) => typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
const uploadLifetime = 20 * 60 * 1000;

export class QuoteError extends Error {
  constructor(status, message, fields) { super(message); this.status = status; this.fields = fields; }
}

export function quoteFingerprint(req) {
  const address = process.env.VERCEL === "1"
    ? String(req.headers["x-vercel-forwarded-for"] || "unknown").split(",")[0].trim()
    : req.socket?.remoteAddress || "local";
  return createHmac("sha256", process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY).update(address).digest("hex");
}

export function isSameOriginQuoteRequest(req) {
  try {
    const origin = new URL(req.headers.origin);
    return origin.host === req.headers.host &&
      (origin.protocol === "https:" || (process.env.VERCEL !== "1" && origin.protocol === "http:")) &&
      req.headers["sec-fetch-site"] !== "cross-site";
  } catch { return false; }
}

export async function prepareQuoteRequest(client, body, fingerprint) {
  const attachments = body?.attachments ?? [];
  const errors = validateQuoteRequest(body, attachments);
  if (body?.website) throw new QuoteError(422, "Please check your request.");
  if (Object.keys(errors).length) throw new QuoteError(422, "Please check the highlighted fields.", errors);
  const request = createQuoteRequest(body, attachments);
  const { data: allowed, error: limitError } = await client.rpc("consume_quote_request_limit", { p_fingerprint: fingerprint });
  if (limitError) throw new QuoteError(503, quoteUnavailable);
  if (!allowed) throw new QuoteError(429, "Too many requests. Please try again in an hour.");

  const id = randomUUID();
  const token = randomBytes(32).toString("hex");
  const createdAt = new Date().toISOString();
  const photos = attachments.map((file, index) => ({
    name: file.name.replace(/[\x00-\x1f\x7f/\\]/g, "_").slice(0, 200),
    mime_type: file.type, size: file.size,
    path: `${id}/${index + 1}.${file.type === "image/png" ? "png" : "jpg"}`,
  }));
  const { error } = await client.from("quote_requests").insert({
    id, full_name: request.fullName, phone: request.phone, email: request.email || null,
    requirements: request.requirements, photos, created_at: createdAt,
    submission_token_hash: createHash("sha256").update(token).digest("hex"),
  });
  if (error) throw new QuoteError(503, quoteUnavailable);
  const uploads = await Promise.all(photos.map(async (photo) => {
    const result = await client.storage.from(QUOTE_PHOTO_BUCKET).createSignedUploadUrl(photo.path, { upsert: false });
    if (result.error || !result.data?.token) throw new QuoteError(503, quoteUnavailable);
    return { path: photo.path, token: result.data.token };
  }));
  return { id, token, uploads, expiresAt: Date.parse(createdAt) + uploadLifetime };
}

export function validateUploadedQuotePhoto(bytes, photo) {
  if (bytes.length !== photo.size || bytes.length > MAX_QUOTE_IMAGE_SIZE) {
    throw new QuoteError(422, "Uploaded photos do not match the selected files. Please select them again.");
  }
  let dimensions;
  try { dimensions = imageSize(bytes); } catch {
    throw new QuoteError(422, "A photo could not be opened. Only valid JPG and PNG photos are accepted.");
  }
  const expected = photo.mime_type === "image/jpeg" ? "jpg" : "png";
  if (dimensions.type !== expected || !dimensions.width || !dimensions.height || dimensions.width * dimensions.height > 40000000) {
    throw new QuoteError(422, "Only JPG/PNG photos up to 40 megapixels are accepted.");
  }
}

export async function completeQuoteRequest(client, body) {
  if (!isQuoteId(body?.id) || typeof body?.token !== "string" || !/^[0-9a-f]{64}$/.test(body.token)) {
    throw new QuoteError(400, "Invalid request. Please submit the form again.");
  }
  const { data: request, error } = await client.from("quote_requests").select("*").eq("id", body.id).maybeSingle();
  if (error) throw new QuoteError(503, quoteUnavailable);
  const hash = createHash("sha256").update(body.token).digest();
  const storedHash = Buffer.from(request?.submission_token_hash || "", "hex");
  if (storedHash.length !== hash.length || !timingSafeEqual(storedHash, hash)) throw new QuoteError(404, "Request not found. Please submit the form again.");
  if (request.submitted_at) return { id: request.id };
  if (Date.now() > Date.parse(request.created_at) + uploadLifetime) throw new QuoteError(410, "Your upload session expired. Please submit the form again.");

  let total = 0;
  for (const photo of request.photos) {
    const result = await client.storage.from(QUOTE_PHOTO_BUCKET).download(photo.path);
    if (result.error || !result.data) throw new QuoteError(422, "A photo has not finished uploading. Please retry your submission.");
    if (result.data.size > MAX_QUOTE_IMAGE_SIZE) throw new QuoteError(422, "Photos must be 5 MB or smaller in total.");
    const bytes = Buffer.from(await result.data.arrayBuffer());
    total += bytes.length;
    if (total > MAX_QUOTE_IMAGE_SIZE) throw new QuoteError(422, "Photos must be 5 MB or smaller in total.");
    validateUploadedQuotePhoto(bytes, photo);
  }
  const result = await client.from("quote_requests").update({ submitted_at: new Date().toISOString() })
    .eq("id", request.id).is("submitted_at", null);
  if (result.error) throw new QuoteError(503, quoteUnavailable);
  return { id: request.id };
}
