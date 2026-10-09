import { createSupabaseServiceClient } from "../supabase/service";
import { createSupabaseServerClient, getWorkspaceAccess, setAdminResponseHeaders } from "../supabase/server";
import { isSameOriginQuoteRequest } from "../quotes/server";
import { BusinessError } from "./server";

export function businessHandler(operations) {
  return async (req, res) => {
    setAdminResponseHeaders(res);
    const operation = operations[req.method];
    if (!operation) { res.setHeader("Allow", Object.keys(operations).join(", ")); return res.status(405).json({ error: "Method not allowed." }); }
    if (req.method !== "GET") {
      if (!isSameOriginQuoteRequest(req)) return res.status(403).json({ error: "Please use the admin panel to manage businesses." });
      if (!/^application\/json(?:;|$)/i.test(req.headers["content-type"] || "")) return res.status(415).json({ error: "Invalid request format." });
    }
    const access = await getWorkspaceAccess({ req, res });
    if (access.status !== "authorized") return res.status(access.status === "unavailable" ? 503 : 401).json({ error: "Please sign in to manage businesses." });
    try {
      const client = req.method === "GET" ? createSupabaseServerClient(req, res) : createSupabaseServiceClient();
      if (!client) throw new BusinessError(503, "Business management is unavailable. Check your Supabase settings.");
      return res.status(req.method === "POST" ? 201 : 200).json(await operation(client, req, access.user));
    } catch (error) {
      return res.status(error instanceof BusinessError ? error.status : 503).json({ error: error instanceof BusinessError ? error.message : "Unable to manage this business. Please try again.", ...(error instanceof BusinessError && error.fields ? { fields: error.fields } : {}) });
    }
  };
}
