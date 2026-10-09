import SalesDashboard from "../../../components/Admin/SalesDashboard";
import QuotationShow from "../../../components/Admin/QuotationShow";
import { createSupabaseServerClient, getWorkspaceAccess, workspaceRedirect } from "../../../lib/supabase/server";
import { readQuotation, QuotationError } from "../../../lib/quotations/server";

export default function ShowQuotation({ user, quote, unavailable }) { return <SalesDashboard user={user} initialModule="quotations" heading={quote?.reference || "Quotation"}>{unavailable ? <p role="alert" className="border-y border-zinc-200 bg-white-500 p-5 text-sm leading-6 text-primary">This quotation is temporarily unavailable. Please try again later.</p> : <QuotationShow quote={quote} />}</SalesDashboard>; }
export async function getServerSideProps(context) {
  const access = await getWorkspaceAccess(context);
  if (access.status !== "authorized") return workspaceRedirect(access.status);
  try { return { props: { user: access.user, quote: await readQuotation(createSupabaseServerClient(context.req, context.res), context.params.id) } }; }
  catch (error) { if (error instanceof QuotationError && error.status === 404) return { notFound: true }; context.res.statusCode = 503; return { props: { user: access.user, quote: null, unavailable: true } }; }
}
