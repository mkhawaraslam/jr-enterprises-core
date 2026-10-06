import { adminQuoteMutationHandler } from "../../../../../lib/quotes/api";
import { cleanQuoteRequest } from "../../../../../lib/quotes/admin";

export default adminQuoteMutationHandler((client, query, body) => cleanQuoteRequest(client, query.id, "photos", body), "DELETE");
export const config = { api: { bodyParser: { sizeLimit: "1kb" } }, maxDuration: 60 };
