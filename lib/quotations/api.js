import { createSupabaseServiceClient } from "../supabase/service";
import { createSupabaseServerClient, getWorkspaceAccess, setAdminResponseHeaders } from "../supabase/server";
import { isSameOriginQuoteRequest } from "../quotes/server";
import { BusinessError } from "../businesses/server";
import { CustomerError } from "../customers/server";
import { ProductError } from "../products/server";
import { QuotationError } from "./server";

export function quotationHandler(operations) {
  return async (req, res) => {
    setAdminResponseHeaders(res);
    const operation = operations[req.method];
    if (!operation) { res.setHeader("Allow", Object.keys(operations).join(", ")); return res.status(405).json({ error: "Method not allowed." }); }
    if (req.method !== "GET" && (!isSameOriginQuoteRequest(req) || !/^application\/json(?:;|$)/i.test(req.headers["content-type"] || ""))) return res.status(403).json({ error: "Please use the admin panel to save quotations." });
    const access = await getWorkspaceAccess({ req, res });
    if (access.status !== "authorized") return res.status(access.status === "unavailable" ? 503 : 401).json({ error: access.status === "unavailable" ? "Quotations are temporarily unavailable." : "Please sign in to manage quotations." });
    try {
      const client = req.method === "GET" ? createSupabaseServerClient(req, res) : createSupabaseServiceClient();
      if (!client) throw new QuotationError(503, "Quotation management is unavailable. Check your Supabase settings.");
      return res.status(req.method === "POST" ? 201 : 200).json(await operation(client, req, access.user));
    } catch (error) {
      const known = [QuotationError, BusinessError, CustomerError, ProductError].some((Type) => error instanceof Type);
      return res.status(known ? error.status : 503).json({ error: known ? error.message : "Unable to manage quotations. Please try again.", ...(known && error.fields ? { fields: error.fields } : {}) });
    }
  };
}
