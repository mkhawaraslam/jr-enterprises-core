import { adminQuoteHandler } from "../../../../lib/quotes/api";
import { QuoteError } from "../../../../lib/quotes/server";

export default adminQuoteHandler(async (client, query) => {
  const page = Math.min(100000, Math.max(1, Number.parseInt(query.page, 10) || 1));
  const search = typeof query.search === "string" ? query.search.trim().slice(0, 100) : "";
  const status = ["new", "reviewed"].includes(query.status) ? query.status : "all";
  const { data, error } = await client.rpc("list_quote_requests", { p_search: search, p_page: page, p_status: status });
  if (error || !data || !Array.isArray(data.items)) throw new QuoteError(503, "Unable to load quote requests. Check that the quote migration has been applied.");
  return { ...data, page };
});
