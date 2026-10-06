import { publicQuoteHandler } from "../../../lib/quotes/api";
import { completeQuoteRequest } from "../../../lib/quotes/server";

export default publicQuoteHandler(completeQuoteRequest);
export const config = { api: { bodyParser: { sizeLimit: "1kb" } }, maxDuration: 60 };
