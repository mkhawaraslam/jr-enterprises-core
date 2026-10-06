export default function DashboardPreviewRedirect() {
  return null;
}

export async function getServerSideProps() {
  return { redirect: { destination: "/admin/dashboard", permanent: false } };
}
