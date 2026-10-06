import { adminQuoteHandler, adminQuoteMutationHandler } from "../../../../lib/quotes/api";
import { cleanQuoteRequest } from "../../../../lib/quotes/admin";
import { isQuoteId, QuoteError, quoteColumns } from "../../../../lib/quotes/server";
import { QUOTE_PHOTO_BUCKET } from "../../../../utils/quoteRequest";

const read = adminQuoteHandler(async (client, query) => {
  if (!isQuoteId(query.id)) throw new QuoteError(404, "Request not found.");
  const { data, error } = await client.from("quote_requests").select(quoteColumns).eq("id", query.id).maybeSingle();
  if (error) throw new QuoteError(503, "Unable to load this request. Please try again.");
  if (!data) throw new QuoteError(404, "Request not found.");
  if (!data.photos.length) return data;
  if (data.cleanup_action) return { ...data, photos: data.photos.map((photo) => ({ ...photo, url: null })), photos_error: "Photo cleanup needs to finish. Use the cleanup action below to retry." };
  const signed = await client.storage.from(QUOTE_PHOTO_BUCKET).createSignedUrls(data.photos.map((photo) => photo.path), 300);
  if (signed.error || !Array.isArray(signed.data) || signed.data.some((photo) => photo.error || !photo.signedUrl) ||
    data.photos.some((photo) => !signed.data.some((item) => item.path === photo.path && item.signedUrl))) {
    throw new QuoteError(503, "Unable to load the product photos. Please try again.");
  }
  return { ...data, photos: data.photos.map((photo) => ({ ...photo, url: signed.data.find((item) => item.path === photo.path)?.signedUrl })) };
});

const remove = adminQuoteMutationHandler((client, query, body) => cleanQuoteRequest(client, query.id, "request", body), "DELETE");
export default function handler(req, res) {
  if (req.method === "DELETE") return remove(req, res);
  if (req.method === "GET") return read(req, res);
  res.setHeader("Allow", "GET, DELETE");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Cache-Control", "private, no-store");
  return res.status(405).json({ error: "Method not allowed." });
}
export const config = { api: { bodyParser: { sizeLimit: "1kb" } }, maxDuration: 60 };
