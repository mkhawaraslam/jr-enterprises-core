import { salesDocumentHandler } from "../../../../../lib/sales-documents/api";
import { createSalesDocument, listSalesDocuments } from "../../../../../lib/sales-documents/server";

export const config = { api: { bodyParser: { sizeLimit: "512kb" } } };
export default salesDocumentHandler({
  GET: (client, req) => listSalesDocuments(client, req.query.kind, req.query),
  POST: (client, req, user) => createSalesDocument(client, req.query.kind, req.body, user),
});
