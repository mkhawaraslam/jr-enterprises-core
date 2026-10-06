import { getWorkspaceAccess, workspaceRedirect } from "../../lib/supabase/server";

export default function AdminEntry() {
  return null;
}

export async function getServerSideProps(context) {
  const access = await getWorkspaceAccess(context);
  if (access.status !== "authorized") return workspaceRedirect(access.status);
  return { redirect: { destination: "/admin/dashboard", permanent: false } };
}
