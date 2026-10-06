import { adminQuoteMutationHandler } from "../../../../../lib/quotes/api";
import { setQuoteReview } from "../../../../../lib/quotes/admin";

export default adminQuoteMutationHandler((client, query, body, user) => setQuoteReview(client, query.id, body, user));
export const config = { api: { bodyParser: { sizeLimit: "1kb" } } };
