import "../styles/tailwind.css";
import { useRouter } from "next/router";
import AdminRobotsHead from "../components/Admin/RobotsHead";
import { isAdminRoute } from "../utils/adminAuth";

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  return (
    <>
      {(isAdminRoute(router.pathname) || isAdminRoute(router.asPath)) && <AdminRobotsHead />}
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
