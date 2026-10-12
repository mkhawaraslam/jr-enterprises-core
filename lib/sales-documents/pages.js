import { createSupabaseServerClient, getWorkspaceAccess, workspaceRedirect } from "../supabase/server";
import { isQuotationId } from "../../utils/adminQuotation";
import { readSalesDocument, SalesDocumentError } from "./server";

export function salesDocumentPageProps(kind, view) {
  return async (context) => {
    const access = await getWorkspaceAccess(context);
    if (access.status !== "authorized") return workspaceRedirect(access.status);
    const props = { user: access.user, kind, view };
    if (view === "new") return { props: { ...props, initialBusinessId: isQuotationId(context.query.business) ? context.query.business.toLowerCase() : "" } };
    if (view !== "show") return { props };
    try { return { props: { ...props, document: await readSalesDocument(createSupabaseServerClient(context.req, context.res), kind, context.params.id) } }; }
    catch (error) {
      if (error instanceof SalesDocumentError && error.status === 404) return { notFound: true };
      context.res.statusCode = 503;
      return { props: { ...props, document: null, unavailable: true } };
    }
  };
}
