import { salesDocumentHandler } from "../../../../../../lib/sales-documents/api";
import { readSalesDocument } from "../../../../../../lib/sales-documents/server";

export default salesDocumentHandler({ GET: (client, req) => readSalesDocument(client, req.query.kind, req.query.id) });
