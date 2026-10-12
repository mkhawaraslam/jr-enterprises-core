import SalesDashboard from "./SalesDashboard";
import SalesDocumentForm from "./SalesDocumentForm";
import SalesDocumentShow from "./SalesDocumentShow";
import { salesDocumentType } from "../../utils/adminSalesDocument";

export default function SalesDocumentPage({ user, kind, view, initialBusinessId, document, unavailable }) {
  const type = salesDocumentType(kind);
  const heading = view === "new" ? "Create " + type.singular : view === "show" ? document?.reference || type.name : type.plural;
  return <SalesDashboard user={user} initialModule={type.module} heading={heading}>
    {unavailable ? <p role="alert" className="border-y border-zinc-200 bg-white-500 p-5 text-sm leading-6 text-primary">This document is temporarily unavailable. Please try again later.</p> : view === "new" ? <SalesDocumentForm key={kind} kind={kind} initialBusinessId={initialBusinessId} /> : view === "show" ? <SalesDocumentShow key={document.id} kind={kind} document={document} /> : null}
  </SalesDashboard>;
}
