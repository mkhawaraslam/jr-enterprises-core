import { quotationHandler } from "../../../../../lib/quotations/api";
import { readQuotation } from "../../../../../lib/quotations/server";

export default quotationHandler({ GET: (client, req) => readQuotation(client, req.query.id) });
