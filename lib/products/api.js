import { createSupabaseServiceClient } from "../supabase/service";
import { createSupabaseServerClient, getWorkspaceAccess, setAdminResponseHeaders } from "../supabase/server";
import { isSameOriginQuoteRequest } from "../quotes/server";
import { ProductError } from "./server";

export function productHandler(operations) {
  return async (req, res) => {
    setAdminResponseHeaders(res);
    const operation = operations[req.method];
    if (!operation) { res.setHeader("Allow", Object.keys(operations).join(", ")); return res.status(405).json({ error: "Method not allowed." }); }
    if (req.method !== "GET") {
      if (!isSameOriginQuoteRequest(req)) return res.status(403).json({ error: "Please use the admin panel to manage products." });
      if (!/^application\/json(?:;|$)/i.test(req.headers["content-type"] || "")) return res.status(415).json({ error: "Invalid request format." });
    }
    const access = await getWorkspaceAccess({ req, res });
    if (access.status !== "authorized") return res.status(access.status === "unavailable" ? 503 : 401).json({ error: access.status === "unavailable" ? "Product management is temporarily unavailable. Please try again." : "Please sign in to manage products." });
    try {
      const client = req.method === "GET" ? createSupabaseServerClient(req, res) : createSupabaseServiceClient();
      if (!client) throw new ProductError(503, "Product management is unavailable. Check your Supabase settings.");
      return res.status(req.method === "POST" ? 201 : 200).json(await operation(client, req, access.user));
    } catch (error) {
      return res.status(error instanceof ProductError ? error.status : 503).json({ error: error instanceof ProductError ? error.message : "Unable to manage this product. Please try again.", ...(error instanceof ProductError && error.fields ? { fields: error.fields } : {}) });
    }
  };
}
