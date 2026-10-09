import { createSupabaseServerClient, getWorkspaceAccess, setAdminResponseHeaders } from "../../../../../lib/supabase/server";
import { createSupabaseServiceClient } from "../../../../../lib/supabase/service";
import { readQuotation, QuotationError } from "../../../../../lib/quotations/server";
import { quotationPdf } from "../../../../../lib/quotations/pdf";

export default async function handler(req, res) {
  setAdminResponseHeaders(res);
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return res.status(405).json({ error: "Method not allowed." }); }
  const access = await getWorkspaceAccess({ req, res });
  if (access.status !== "authorized") return res.status(access.status === "unavailable" ? 503 : 401).json({ error: "Please sign in to view this quotation." });
  try {
    const quote = await readQuotation(createSupabaseServerClient(req, res), req.query.id);
    const client = createSupabaseServiceClient();
    if (!client) throw new QuotationError(503, "PDF generation is unavailable. Check the server-only Supabase key.");
    const bytes = await quotationPdf(client, quote);
    res.setHeader("Content-Type", "application/pdf"); res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Disposition", `inline; filename="${quote.reference}.pdf"`);
    return res.status(200).send(bytes);
  } catch (error) { return res.status(error instanceof QuotationError ? error.status : 503).json({ error: error instanceof QuotationError ? error.message : "The quotation PDF could not be generated. Its saved details remain unchanged." }); }
}
