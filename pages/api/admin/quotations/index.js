import { quotationHandler } from "../../../../lib/quotations/api";
import { createQuotation, listQuotations } from "../../../../lib/quotations/server";

export const config = { api: { bodyParser: { sizeLimit: "512kb" } } };
export default quotationHandler({ GET: (client, req) => listQuotations(client, req.query), POST: (client, req, user) => createQuotation(client, req.body, user) });
