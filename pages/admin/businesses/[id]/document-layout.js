import BusinessLayoutEditor from "../../../../components/Admin/BusinessLayoutEditor";
import SalesDashboard from "../../../../components/Admin/SalesDashboard";
import { getWorkspaceAccess, workspaceRedirect } from "../../../../lib/supabase/server";
import { isBusinessId } from "../../../../lib/businesses/server";

export default function DocumentLayoutPage({ user, businessId }) {
  return <SalesDashboard user={user} initialModule="business" heading="Document layout"><BusinessLayoutEditor businessId={businessId} /></SalesDashboard>;
}
export async function getServerSideProps(context) {
  const access = await getWorkspaceAccess(context);
  if (access.status !== "authorized") return workspaceRedirect(access.status);
  if (!isBusinessId(context.params.id)) return { notFound: true };
  return { props: { user: access.user, businessId: context.params.id } };
}
