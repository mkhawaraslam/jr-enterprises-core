import { salesDocumentHandler } from "../../../../../lib/sales-documents/api";
import { salesDocumentBusiness, SalesDocumentError } from "../../../../../lib/sales-documents/server";
import { listBusinesses } from "../../../../../lib/businesses/server";
import { listCustomers } from "../../../../../lib/customers/server";
import { listProducts } from "../../../../../lib/products/server";

export default salesDocumentHandler({ GET: async (client, req) => {
  const directory = req.query.directory;
  if (!["business", "customer", "product"].includes(directory)) throw new SalesDocumentError(400, "Choose a valid directory.");
  if (directory === "business" && req.query.id) return salesDocumentBusiness(client, req.query.kind, req.query.id);
  return { business: listBusinesses, customer: listCustomers, product: listProducts }[directory](client, req.query);
} });
