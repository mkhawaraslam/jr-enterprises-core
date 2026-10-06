import { createSupabaseServiceClient } from "../supabase/service";
import { createSupabaseServerClient, getWorkspaceAccess, setAdminResponseHeaders } from "../supabase/server";
import { isSameOriginQuoteRequest, QuoteError, quoteFingerprint, quoteUnavailable } from "./server";

export function publicQuoteHandler(operation) {
  return async (req, res) => {
    setAdminResponseHeaders(res);
    if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Method not allowed." }); }
    if (!isSameOriginQuoteRequest(req)) return res.status(403).json({ error: "Please submit this request from our website." });
    if (!/^application\/json(?:;|$)/i.test(req.headers["content-type"] || "")) return res.status(415).json({ error: "Invalid request format." });
    try {
      const client = createSupabaseServiceClient();
      if (!client) throw new QuoteError(503, quoteUnavailable);
      const data = await operation(client, req.body, quoteFingerprint(req));
      return res.status(200).json(data);
    } catch (error) {
      if (error.status === 429) res.setHeader("Retry-After", "3600");
      return res.status(error instanceof QuoteError ? error.status : 503).json({
        error: error instanceof QuoteError ? error.message : quoteUnavailable,
        ...(error instanceof QuoteError && error.fields ? { fields: error.fields } : {}),
      });
    }
  };
}

export function adminQuoteHandler(operation) {
  return async (req, res) => {
    setAdminResponseHeaders(res);
    if (req.method !== "GET") { res.setHeader("Allow", "GET"); return res.status(405).json({ error: "Method not allowed." }); }
    const access = await getWorkspaceAccess({ req, res });
    if (access.status !== "authorized") return res.status(access.status === "unavailable" ? 503 : 401).json({ error: "Please sign in to view quote requests." });
    try {
      const client = createSupabaseServerClient(req, res);
      return res.status(200).json(await operation(client, req.query));
    } catch (error) {
      return res.status(error instanceof QuoteError ? error.status : 503).json({
        error: error instanceof QuoteError ? error.message : "Unable to load quote requests. Please try again.",
      });
    }
  };
}

export function adminQuoteMutationHandler(operation, method = "POST") {
  return async (req, res) => {
    setAdminResponseHeaders(res);
    if (req.method !== method) { res.setHeader("Allow", method); return res.status(405).json({ error: "Method not allowed." }); }
    if (!isSameOriginQuoteRequest(req)) return res.status(403).json({ error: "Please use the admin panel to update requests." });
    if (!/^application\/json(?:;|$)/i.test(req.headers["content-type"] || "")) return res.status(415).json({ error: "Invalid request format." });
    const access = await getWorkspaceAccess({ req, res });
    if (access.status !== "authorized") return res.status(access.status === "unavailable" ? 503 : 401).json({ error: "Please sign in to manage quote requests." });
    try {
      const client = createSupabaseServiceClient();
      if (!client) throw new QuoteError(503, "Quote management is unavailable. Check the server-only Supabase key.");
      return res.status(200).json(await operation(client, req.query, req.body, access.user));
    } catch (error) {
      return res.status(error instanceof QuoteError ? error.status : 503).json({ error: error instanceof QuoteError ? error.message : "Unable to update this request. Please try again." });
    }
  };
}
