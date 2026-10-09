import SalesDashboard from "../../../components/Admin/SalesDashboard";
import QuotationForm from "../../../components/Admin/QuotationForm";
import { getWorkspaceAccess, workspaceRedirect } from "../../../lib/supabase/server";
import { isQuotationId } from "../../../utils/adminQuotation";

export default function NewQuotation({ user, initialBusinessId }) { return <SalesDashboard user={user} initialModule="quotations" heading="Create quotation"><QuotationForm initialBusinessId={initialBusinessId} /></SalesDashboard>; }
export async function getServerSideProps(context) {
  const access = await getWorkspaceAccess(context);
  if (access.status !== "authorized") return workspaceRedirect(access.status);
  return { props: { user: access.user, initialBusinessId: isQuotationId(context.query.business) ? context.query.business.toLowerCase() : "" } };
}
