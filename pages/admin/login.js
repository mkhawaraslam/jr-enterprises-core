import AuthFrame from "../../components/Admin/AuthFrame";
import LoginForm from "../../components/Admin/LoginForm";
import { getWorkspaceAccess } from "../../lib/supabase/server";

export default function AdminLogin(props) {
  return <AuthFrame><LoginForm {...props} /></AuthFrame>;
}

export async function getServerSideProps(context) {
  const access = await getWorkspaceAccess(context);
  if (access.status === "authorized") return { redirect: { destination: "/admin/dashboard", permanent: false } };
  return {
    props: {
      unavailable: access.status === "unavailable",
      accessDenied: access.status === "forbidden" || context.query.error === "access_denied",
    },
  };
}
