import { randomUUID } from "node:crypto";
import { QUOTE_PHOTO_BUCKET } from "../../utils/quoteRequest";
import { isQuoteId, QuoteError } from "./server";

const unavailable = "Unable to update this request. Please try again.";
function mutationError(error) {
  if (error?.code === "P0001" && error.message === "review_required") return new QuoteError(409, "Mark this request reviewed before removing photos or deleting it.");
  if (error?.code === "P0001" && error.message === "cleanup_conflict") return new QuoteError(409, "This request has a cleanup in progress. Finish or retry that cleanup first; if another action is running, wait two minutes.");
  return new QuoteError(503, unavailable);
}

export async function setQuoteReview(client, id, body, user) {
  if (!isQuoteId(id)) throw new QuoteError(404, "Request not found.");
  if (typeof body?.reviewed !== "boolean") throw new QuoteError(400, "Choose a valid review status.");
  const { data, error } = await client.rpc("set_quote_request_review", { p_id: id, p_reviewed: body.reviewed, p_reviewer: user.id });
  if (error) throw mutationError(error);
  if (!data) throw new QuoteError(404, "Request not found.");
  return data;
}

export async function cleanQuoteRequest(client, id, action, body) {
  if (!isQuoteId(id)) throw new QuoteError(404, "Request not found.");
  const confirmation = action === "request" ? "delete-request" : "remove-photos";
  if (body?.confirmation !== confirmation) throw new QuoteError(400, "Please confirm this action.");
  const token = randomUUID();
  const claimed = await client.rpc("claim_quote_cleanup", { p_id: id, p_action: action, p_token: token });
  if (claimed.error) throw mutationError(claimed.error);
  if (!claimed.data) {
    if (action === "request") return { id, deleted: true };
    throw new QuoteError(404, "Request not found.");
  }
  try {
    const paths = claimed.data.photos.map((photo) => photo.path);
    if (paths.some((path) => typeof path !== "string" || !new RegExp(`^${id}/(?:[1-9]|10)\\.(?:jpg|png)$`, "i").test(path))) throw new QuoteError(503, "Photo references could not be verified. The request has been kept.");
    if (paths.length) {
      const removed = await client.storage.from(QUOTE_PHOTO_BUCKET).remove(paths);
      if (removed.error) throw new QuoteError(503, "Photo removal failed. The request and its photo references have been kept so you can retry.");
    }
    const finished = await client.rpc("finish_quote_cleanup", { p_id: id, p_token: token });
    if (finished.error || !finished.data) throw new QuoteError(503, "Photos were removed, but the request update could not finish. Retry the same action to complete cleanup.");
    return { id, ...(action === "request" ? { deleted: true } : { photosRemoved: true }) };
  } catch (error) {
    try { await client.rpc("release_quote_cleanup", { p_id: id, p_token: token }); } catch {}
    throw error;
  }
}
