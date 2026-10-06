import { ChevronLeft, ChevronRight, Eye, FileText, Receipt, SearchX, Truck, X } from "lucide-react";
import { formatAmount, formatDocumentDate } from "../../data/salesPrototype";
import PrototypeDialog from "./PrototypeDialog";

export const documentIcons = { Quotation: FileText, Invoice: Receipt, "Delivery Challan": Truck };
export const iconButtonClass = "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
const statusColors = {
  Draft: "bg-zinc-100 text-zinc-600",
  Sent: "bg-sky-50 text-sky-700",
  Accepted: "bg-emerald-50 text-emerald-700",
  Paid: "bg-emerald-50 text-emerald-700",
  Unpaid: "bg-amber-50 text-amber-800",
  Overdue: "bg-primary-light text-primary",
  Ready: "bg-sky-50 text-sky-700",
  Delivered: "bg-emerald-50 text-emerald-700",
};

export function StatusBadge({ status }) {
  return <span className={"inline-flex items-center gap-1.5 whitespace-nowrap rounded px-2 py-1 text-xs font-medium " + (statusColors[status] || statusColors.Draft)}><span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />{status}</span>;
}

export default function SalesDocuments({ documents, page, onPageChange, onView }) {
  const pageSize = 5;
  const pageCount = Math.max(1, Math.ceil(documents.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const rows = documents.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return (
    <>
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[650px] text-left text-sm">
          <caption className="sr-only">Sample sales documents. Amounts are in Pakistani rupees.</caption>
          <thead className="border-y border-zinc-100 bg-zinc-50 text-xs font-medium text-zinc-500">
            <tr>{["Document", "Customer", "Issued on", "Amount / PKR", "Status", ""].map((heading, index) => <th key={index} scope="col" className={"px-5 py-3 font-medium " + (index === 3 ? "text-right" : "")}>{heading || <span className="sr-only">Actions</span>}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((document) => {
              const Icon = documentIcons[document.type];
              return (
                <tr key={document.id} className="transition-colors hover:bg-zinc-50/80">
                  <th scope="row" className="px-5 py-4 font-normal">
                    <div className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-200 text-zinc-500"><Icon className="h-4 w-4" aria-hidden="true" /></span><div><button type="button" onClick={() => onView(document)} className="whitespace-nowrap text-sm font-medium text-zinc-800 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{document.id}</button><div className="mt-1 text-xs text-zinc-500">{document.type}</div></div></div>
                  </th>
                  <td className="px-5 py-4 text-zinc-700">{document.customer}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-zinc-500">{formatDocumentDate(document.date)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-right font-medium tabular-nums text-zinc-800">{formatAmount(document.amount)}</td>
                  <td className="px-5 py-4"><StatusBadge status={document.status} /></td>
                  <td className="px-3 py-4"><button type="button" onClick={() => onView(document)} className={iconButtonClass} title={"View " + document.id} aria-label={"View " + document.id}><Eye className="h-4 w-4" aria-hidden="true" /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!rows.length && <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 px-5 text-center"><SearchX className="h-7 w-7 text-zinc-400" aria-hidden="true" /><p className="text-sm text-zinc-600">No matching documents</p></div>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 px-5 py-3">
        <p className="text-xs text-zinc-500" aria-live="polite">{documents.length ? `${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, documents.length)} of ${documents.length} documents` : "0 documents"}</p>
        <div className="flex items-center gap-2"><button type="button" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)} aria-label="Previous page" title="Previous page" className={iconButtonClass + " border border-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"}><ChevronLeft className="h-4 w-4" aria-hidden="true" /></button><span className="min-w-[3rem] text-center text-xs tabular-nums text-zinc-500">{currentPage} / {pageCount}</span><button type="button" disabled={currentPage === pageCount} onClick={() => onPageChange(currentPage + 1)} aria-label="Next page" title="Next page" className={iconButtonClass + " border border-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"}><ChevronRight className="h-4 w-4" aria-hidden="true" /></button></div>
      </div>
    </>
  );
}

export function DocumentPreview({ document, onClose }) {
  const isDelivery = document?.type === "Delivery Challan";
  return (
    <PrototypeDialog open={Boolean(document)} onClose={onClose} labelledBy="document-preview-heading">
      {document && <>
        <header className="flex items-center justify-between gap-4 border-b border-zinc-200 px-6 py-5"><div><div className="mb-1 text-xs font-medium text-primary">Sample document</div><h2 id="document-preview-heading" className="text-xl font-medium">{document.id}</h2></div><button type="button" onClick={onClose} title="Close document" aria-label="Close document" className={iconButtonClass}><X className="h-5 w-5" aria-hidden="true" /></button></header>
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-xs text-zinc-500">{document.type} for</div><h3 className="mt-2 text-lg font-medium">{document.customer}</h3></div><StatusBadge status={document.status} /></div>
          <dl className="my-7 grid grid-cols-2 gap-5 border-y border-zinc-100 py-5"><div><dt className="text-xs text-zinc-500">Issued on</dt><dd className="mt-2 text-sm">{formatDocumentDate(document.date)}</dd></div><div><dt className="text-xs text-zinc-500">{document.dueDate ? "Due on" : "Currency"}</dt><dd className="mt-2 text-sm">{document.dueDate ? formatDocumentDate(document.dueDate) : "PKR"}</dd></div></dl>
          <div className="overflow-x-auto"><table className="w-full min-w-[300px] text-left text-sm"><caption className="sr-only">Document items</caption><thead className="border-b border-zinc-200 text-xs text-zinc-500"><tr><th scope="col" className="pb-3 font-medium">Product</th><th scope="col" className="pb-3 text-right font-medium">Qty</th>{!isDelivery && <th scope="col" className="pb-3 text-right font-medium">Amount / PKR</th>}</tr></thead><tbody>{document.items.map((item) => <tr key={item.name} className="border-b border-zinc-100"><td className="py-4 pr-4">{item.name}</td><td className="py-4 text-right tabular-nums">{item.quantity}</td>{!isDelivery && <td className="py-4 text-right tabular-nums">{formatAmount(item.price * item.quantity)}</td>}</tr>)}</tbody></table></div>
          {!isDelivery && <div className="mt-6 flex items-center justify-between gap-4"><span className="text-sm text-zinc-500">Total</span><span className="text-xl font-medium tabular-nums">PKR {formatAmount(document.amount)}</span></div>}
        </div>
      </>}
    </PrototypeDialog>
  );
}
