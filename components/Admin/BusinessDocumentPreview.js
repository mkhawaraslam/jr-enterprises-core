import { Building2 } from "lucide-react";
import { documentTypes, findBusinessTemplate } from "../../utils/businessTemplates";

const demoItems = [
  { code: "VAL-025", name: "Stainless steel ball valve, 25 mm", quantity: 4, unit: "pcs", rate: 8500 },
  { code: "PN-050", name: "Pneumatic cylinder, 50 mm bore", quantity: 2, unit: "pcs", rate: 14500 },
  { code: "FT-008", name: "Pneumatic push-in fitting, 8 mm", quantity: 10, unit: "pcs", rate: 650 },
];
const number = new Intl.NumberFormat("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const total = demoItems.reduce((sum, item) => sum + item.quantity * item.rate, 0);

function CompanyIdentity({ business, compact = false }) {
  return <div className={"min-w-0 " + (compact ? "flex items-start gap-3" : "space-y-3")}>
    {business.logo?.url ? <img src={business.logo.url} alt={business.name ? business.name + " logo" : "Business logo"} width={128} height={56} className="h-14 w-28 shrink-0 object-contain object-left" /> : <div className="flex h-14 w-14 shrink-0 items-center justify-center border border-zinc-200"><Building2 className="h-7 w-7 text-zinc-400" aria-hidden="true" /></div>}
    <div className="min-w-0">
      <p className="break-words text-base font-semibold leading-6 text-zinc-900">{business.name || "Your business"}</p>
      <p className="mt-1 whitespace-pre-wrap break-words text-[11px] leading-4 text-zinc-500">{business.address || "Business address"}</p>
      <p className="mt-1 break-all text-[11px] leading-4 text-zinc-500">{business.email || "Business email"} | {business.phone || "Business phone"}</p>
      <p className="mt-1 break-words text-[11px] leading-4 text-zinc-600">NTN: {business.ntn || "Business NTN"}</p>
    </div>
  </div>;
}

function DocumentReference({ document, className = "" }) {
  return <dl className={"grid gap-2 text-[11px] leading-4 " + className}>
    <div><dt className="text-zinc-500">Reference</dt><dd className="mt-0.5 break-all font-medium">{document.reference}</dd></div>
    <div><dt className="text-zinc-500">Date</dt><dd className="mt-0.5">08 Oct 2026</dd></div>
  </dl>;
}

export default function BusinessDocumentPreview({ business, templateId, templateVersion, documentType = "quotation" }) {
  const template = findBusinessTemplate(templateId, templateVersion);
  const document = documentTypes.find((type) => type.id === documentType);
  if (!template || !document) return <p role="status" className="p-4 text-sm text-zinc-500">Template preview unavailable.</p>;
  const industrial = template.id === "industrial";
  const ledger = template.id === "ledger";
  const challan = document.id === "delivery-challan";
  const tableHead = industrial ? "bg-primary text-primary-foreground" : ledger ? "bg-emerald-50 text-emerald-900" : "border-y-2 border-zinc-800 text-zinc-900";
  const heading = <h4 className={"break-words text-xl font-semibold " + (industrial ? "text-primary-foreground" : ledger ? "text-emerald-800" : "text-zinc-900")}>{document.name}</h4>;
  const notes = business.special_notes?.trim();

  return <article aria-label={template.name + " " + document.name + " sample"} className={"flex min-h-[630px] min-w-[360px] flex-col bg-white-500 text-zinc-900 " + (industrial ? "border-t-4 border-primary" : ledger ? "border-l-4 border-emerald-700" : "border-t-2 border-zinc-800")}>
    <header className="px-6 pt-6">
      {ledger ? <div className="grid grid-cols-[minmax(0,1fr)_132px] items-start gap-5 border-b border-emerald-200 pb-5"><CompanyIdentity business={business} /><div className="min-w-0 space-y-3 text-right">{heading}<DocumentReference document={document} /></div></div> : <>
        <CompanyIdentity business={business} compact={!industrial} />
        <div className={"mt-5 flex items-start justify-between gap-5 " + (industrial ? "-mx-6 bg-primary px-6 py-4" : "border-y border-zinc-200 py-4")}>
          <div className="min-w-0">{heading}{industrial && <p className="mt-1 text-[11px] text-primary-foreground">{document.reference}</p>}</div>
          {industrial ? <div className="shrink-0 text-right text-[11px]"><p className="text-primary-foreground">Date</p><p className="mt-1 text-primary-foreground">08 Oct 2026</p></div> : <DocumentReference document={document} className="shrink-0" />}
        </div>
      </>}
    </header>
    <div className="flex-1 px-6 py-5">
      <div className="grid grid-cols-2 gap-6 pb-5 text-[11px] leading-5">
        <div className="min-w-0"><p className="font-medium uppercase text-zinc-400">{document.recipient}</p><p className="mt-1 font-semibold">Sample Industrial Client</p><p className="text-zinc-500">Procurement department<br />Islamabad, Pakistan</p></div>
        <div className="min-w-0 text-right"><p className="font-medium uppercase text-zinc-400">{challan ? "Dispatch details" : document.id === "invoice" ? "Payment terms" : "Quotation details"}</p><p className="mt-1">{challan ? "Against: INV-DEMO-001" : document.id === "invoice" ? "As agreed" : "Validity: 15 days"}</p><p className="text-zinc-500">{challan ? "Transport: As arranged" : "Currency: PKR"}</p></div>
      </div>
      <table className="w-full table-fixed border-collapse text-left text-[11px] leading-4">
        <caption className="sr-only">Sample {document.name.toLowerCase()} items{!challan && " and prices in PKR"}</caption>
        <thead className={tableHead}><tr><th scope="col" className={"px-2 py-3 font-medium " + (challan ? "w-[62%]" : "w-[46%]")}>Description</th><th scope="col" className="w-[9%] px-1 py-3 text-right font-medium">Qty</th>{challan && <th scope="col" className="w-[11%] px-1 py-3 text-center font-medium">Unit</th>}{challan ? <th scope="col" className="px-2 py-3 font-medium">Remarks</th> : <><th scope="col" className="w-[20%] px-1 py-3 text-right font-medium">Rate</th><th scope="col" className="px-2 py-3 text-right font-medium">Amount</th></>}</tr></thead>
        <tbody className="divide-y divide-zinc-200">{demoItems.map((item, index) => <tr key={item.code} className={ledger && index % 2 === 0 ? "bg-zinc-50" : ""}><td className="break-words px-2 py-3.5 align-top"><p className="font-medium">{item.name}</p><p className="mt-1 text-[10px] text-zinc-400">{item.code}</p></td><td className="px-1 py-3.5 text-right align-top tabular-nums">{item.quantity}{!challan && <span className="mt-1 block text-[10px] text-zinc-400">{item.unit}</span>}</td>{challan && <td className="px-1 py-3.5 text-center align-top">{item.unit}</td>}{challan ? <td className="px-2 py-3.5 align-top text-zinc-500">Received</td> : <><td className="whitespace-nowrap px-1 py-3.5 text-right align-top tabular-nums">{number.format(item.rate)}</td><td className="whitespace-nowrap px-2 py-3.5 text-right align-top tabular-nums">{number.format(item.quantity * item.rate)}</td></>}</tr>)}</tbody>
      </table>
      {challan ? <div className="mt-4 flex justify-between border-t border-zinc-200 pt-3 text-xs"><span>Total quantity</span><strong className="tabular-nums">16 pcs</strong></div> : <dl className="ml-auto mt-4 w-48 space-y-2 text-[11px]"><div className="flex justify-between gap-3"><dt>Subtotal</dt><dd className="tabular-nums">{number.format(total)}</dd></div><div className={"flex justify-between gap-3 border-t-2 pt-3 text-sm font-semibold " + (industrial ? "border-primary text-primary" : ledger ? "border-emerald-700 text-emerald-800" : "border-zinc-800")}><dt>Total (PKR)</dt><dd className="tabular-nums">{number.format(total)}</dd></div></dl>}
      <div className="mt-7"><h5 className="text-[11px] font-semibold text-zinc-700">{notes ? "Special notes and instructions" : challan ? "Delivery notes" : "Terms and conditions"}</h5><p className="mt-2 whitespace-pre-wrap break-words text-[11px] leading-5 text-zinc-500">{notes ? notes.slice(0, 600) + (notes.length > 600 ? "..." : "") : challan ? "Please acknowledge the quantity and condition of goods received." : "Payment and delivery terms are subject to confirmation."}</p></div>
    </div>
    <footer className="mx-6 border-t border-zinc-200 pb-5 pt-4">
      <div className="flex items-end justify-between gap-5">
        <div className="text-[10px] text-zinc-400"><p>Sample preview</p><p className="mt-1">{template.name} / v{template.version} / 1 of 1</p></div>
        <div className="w-36 text-center">{business.signature?.url ? <img src={business.signature.url} alt="Business authorized signature" width={144} height={48} className="mb-2 h-12 w-full object-contain" /> : <div className="h-12" />}<p className="border-t border-zinc-400 pt-2 text-[10px] text-zinc-500">{challan ? "Authorized by" : "Authorized signature"}</p></div>
      </div>
      {challan && <div className="mt-6 grid grid-cols-2 gap-8 text-[10px] text-zinc-500"><p className="border-t border-zinc-400 pt-2">Received by / signature</p><p className="border-t border-zinc-400 pt-2">Date / company stamp</p></div>}
    </footer>
  </article>;
}
