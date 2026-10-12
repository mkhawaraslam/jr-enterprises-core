import SalesDocumentPage from "../../../components/Admin/SalesDocumentPage";
import { salesDocumentPageProps } from "../../../lib/sales-documents/pages";

export default SalesDocumentPage;
export const getServerSideProps = salesDocumentPageProps("challan", "new");
