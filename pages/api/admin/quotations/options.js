import { quotationHandler } from "../../../../lib/quotations/api";
import { quotationBusiness, QuotationError } from "../../../../lib/quotations/server";
import { listBusinesses } from "../../../../lib/businesses/server";
import { listCustomers } from "../../../../lib/customers/server";
import { listProducts } from "../../../../lib/products/server";

export default quotationHandler({ GET: async (client, req) => {
  if (!["business", "customer", "product"].includes(req.query.kind)) throw new QuotationError(400, "Choose a valid directory.");
  if (req.query.kind === "business" && req.query.id) return quotationBusiness(client, req.query.id);
  const listing = { business: listBusinesses, customer: listCustomers, product: listProducts }[req.query.kind];
  return listing(client, req.query);
} });
