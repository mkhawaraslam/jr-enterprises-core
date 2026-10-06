import { adminQuoteHandler } from "../../../../lib/quotes/api";
import { QuoteError } from "../../../../lib/quotes/server";

export default adminQuoteHandler(async (client) => {
  const { data, error } = await client.rpc("get_quote_request_counts");
  if (error || !data || !Number.isSafeInteger(data.total) || !Number.isSafeInteger(data.unreviewed)) throw new QuoteError(503, "Unable to load request counts. Check that the review migration has been applied.");
  return data;
});
