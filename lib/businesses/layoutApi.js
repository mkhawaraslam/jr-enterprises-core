import { createSupabaseServerClient, getWorkspaceAccess, setAdminResponseHeaders } from "../supabase/server";
import { isSameOriginQuoteRequest } from "../quotes/server";
import { BusinessError } from "./server";

export function layoutFileHandler(method, operation) {
  return async (req, res) => {
    setAdminResponseHeaders(res);
    if (req.method !== method) { res.setHeader("Allow", method); return res.status(405).json({ error: "Method not allowed." }); }
    if (method === "POST" && (!isSameOriginQuoteRequest(req) || !/^application\/json(?:;|$)/i.test(req.headers["content-type"] || ""))) return res.status(403).json({ error: "Please use the document layout editor." });
    const access = await getWorkspaceAccess({ req, res });
    if (access.status !== "authorized") return res.status(access.status === "unavailable" ? 503 : 401).json({ error: "Please sign in to view document layouts." });
    try {
      const file = await operation(createSupabaseServerClient(req, res), req);
      res.setHeader("Content-Type", file.type); res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Disposition", 'inline; filename="' + file.name + '"');
      return res.status(200).send(file.bytes);
    } catch (error) {
      return res.status(error instanceof BusinessError ? error.status : 503).json({ error: error instanceof BusinessError ? error.message : "The document preview is temporarily unavailable. Please try again." });
    }
  };
}
