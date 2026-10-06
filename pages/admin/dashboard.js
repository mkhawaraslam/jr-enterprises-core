import SalesDashboard from "../../components/Admin/SalesDashboard";
import { getWorkspaceAccess, workspaceRedirect } from "../../lib/supabase/server";

export default function AdminDashboard({ user, initialModule }) {
  return <SalesDashboard user={user} initialModule={initialModule} />;
}

export async function getServerSideProps(context) {
  const access = await getWorkspaceAccess(context);
  if (access.status !== "authorized") return workspaceRedirect(access.status);
  const view = context.query.view;
  const initialModule = ["business", "customers", "products", "quotations", "invoices", "delivery"].includes(view) ? view : "overview";
  return { props: { user: access.user, initialModule } };
}
