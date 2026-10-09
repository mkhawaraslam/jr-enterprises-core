import SalesDashboard from "../../components/Admin/SalesDashboard";
import { getWorkspaceAccess, workspaceRedirect } from "../../lib/supabase/server";

export default function AdminCustomers({ user }) { return <SalesDashboard user={user} initialModule="customers" />; }
export async function getServerSideProps(context) {
  const access = await getWorkspaceAccess(context);
  if (access.status !== "authorized") return workspaceRedirect(access.status);
  return { props: { user: access.user } };
}
