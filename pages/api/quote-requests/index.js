import { publicQuoteHandler } from "../../../lib/quotes/api";
import { prepareQuoteRequest } from "../../../lib/quotes/server";

export default publicQuoteHandler(prepareQuoteRequest);
export const config = { api: { bodyParser: { sizeLimit: "32kb" } }, maxDuration: 60 };
