import { useState } from "react";
import { ArrowDownLeft, ArrowRight, CircleCheck, Clock3, FileText, Receipt, Truck, Wallet } from "lucide-react";
import { formatAmount, prototypeActivity } from "../../data/salesPrototype";
import { documentIcons } from "./SalesDocuments";

const chartMonths = [
  { label: "May", invoiced: 312000, received: 240000, heights: ["h-[75px]", "h-[58px]"] },
  { label: "Jun", invoiced: 398000, received: 280000, heights: ["h-[96px]", "h-[67px]"] },
  { label: "Jul", invoiced: 356000, received: 310000, heights: ["h-[85px]", "h-[74px]"] },
  { label: "Aug", invoiced: 468000, received: 365000, heights: ["h-[112px]", "h-[88px]"] },
  { label: "Sep", invoiced: 493500, received: 237500, heights: ["h-[118px]", "h-[57px]"] },
  { label: "Oct", invoiced: 547000, received: 241000, heights: ["h-[131px]", "h-[58px]"] },
];

export function SalesSnapshot({ snapshot }) {
  const metrics = [
    { label: "Total invoiced", value: formatAmount(snapshot.invoiced), detail: `${snapshot.invoiceCount} invoices issued`, icon: Receipt, color: "bg-zinc-100 text-zinc-600", currency: true },
    { label: "Payments received", value: formatAmount(snapshot.received), detail: "Paid invoices", icon: ArrowDownLeft, color: "bg-emerald-50 text-emerald-700", currency: true },
    { label: "Outstanding balance", value: formatAmount(snapshot.outstanding), detail: `${snapshot.overdueCount} overdue ${snapshot.overdueCount === 1 ? "invoice" : "invoices"}`, icon: Wallet, color: "bg-amber-50 text-amber-800", currency: true },
    { label: "Open quotations", value: String(snapshot.pendingQuotes).padStart(2, "0"), detail: "Drafts & awaiting response", icon: FileText, color: "bg-primary-light text-primary" },
  ];
  return (
    <dl className="grid grid-cols-1 gap-4 xs:grid-cols-2 xl:grid-cols-4">
      {metrics.map(({ label, value, detail, icon: Icon, color, currency }) => (
        <div key={label} className="min-w-0 rounded-lg border border-zinc-200 bg-white-500 p-4">
          <dt className="flex min-h-[2.5rem] items-start justify-between gap-3">
            <span className="pt-1 text-xs font-medium leading-5 text-zinc-500">{label}</span>
            <span className={"flex h-8 w-8 shrink-0 items-center justify-center rounded-md " + color}><Icon className="h-4 w-4" aria-hidden="true" /></span>
          </dt>
          <dd>
            <div className="mt-3 flex flex-wrap items-baseline gap-2 text-xl font-medium leading-8 tabular-nums text-zinc-900">
              {currency && <span className="text-[10px] font-normal text-zinc-400">PKR</span>}{value}
            </div>
            <p className="mt-2 text-xs leading-5 text-zinc-500">{detail}</p>
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function SalesPerformance() {
  const [selected, setSelected] = useState(5);
  const month = chartMonths[selected];
  return (
    <section aria-labelledby="sales-performance-heading" className="relative min-w-0 rounded-lg border border-zinc-200 bg-white-500 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="sales-performance-heading" className="text-sm font-medium">Sales performance</h2><p className="mt-1 text-xs text-zinc-500">May - October 2026</p></div><div className="flex items-center gap-4 text-xs text-zinc-500"><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-primary" aria-hidden="true" />Invoiced</span><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-zinc-300" aria-hidden="true" />Received</span></div></div>
      <div className="mt-7 flex gap-3">
        <div className="flex h-36 w-10 shrink-0 flex-col justify-between text-[10px] tabular-nums text-zinc-400"><span>600k</span><span>300k</span><span>0</span></div>
        <div className="relative min-w-0 flex-1">
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 flex h-36 flex-col justify-between"><div className="border-t border-dashed border-zinc-200" /><div className="border-t border-dashed border-zinc-200" /><div className="border-t border-zinc-200" /></div>
          <div className="relative grid grid-cols-6 gap-2">{chartMonths.map((entry, index) => <button type="button" key={entry.label} onClick={() => setSelected(index)} aria-pressed={selected === index} aria-label={`${entry.label} 2026: invoiced PKR ${formatAmount(entry.invoiced)}, received PKR ${formatAmount(entry.received)}`} title={`${entry.label}: invoiced PKR ${formatAmount(entry.invoiced)}, received PKR ${formatAmount(entry.received)}`} className="group min-w-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><span className="flex h-36 items-end justify-center gap-1 sm:gap-1.5"><span className={"block w-3 rounded-t-sm bg-primary transition-colors group-hover:bg-primary-hover sm:w-5 " + entry.heights[0]} /><span className={"block w-3 rounded-t-sm bg-zinc-300 transition-colors group-hover:bg-zinc-400 sm:w-5 " + entry.heights[1]} /></span><span className={"mt-3 block text-[11px] " + (selected === index ? "font-medium text-primary" : "text-zinc-500")}>{entry.label}</span></button>)}</div>
        </div>
      </div>
      <div aria-live="polite" className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-zinc-100 pt-4 text-xs"><span className="font-medium text-zinc-700">{month.label} 2026</span><span className="text-zinc-500">Invoiced <strong className="font-medium text-zinc-700">{formatAmount(month.invoiced)}</strong></span><span className="text-zinc-500">Received <strong className="font-medium text-zinc-700">{formatAmount(month.received)}</strong></span><span className="ml-auto text-zinc-400">PKR</span></div>
      <div className="sr-only"><table><caption>Sample monthly invoiced and received amounts in PKR</caption><thead><tr><th scope="col">Month</th><th scope="col">Invoiced</th><th scope="col">Received</th></tr></thead><tbody>{chartMonths.map((entry) => <tr key={entry.label}><th scope="row">{entry.label} 2026</th><td>{entry.invoiced}</td><td>{entry.received}</td></tr>)}</tbody></table></div>
    </section>
  );
}

export function SalesAttention({ snapshot, onNavigate }) {
  const items = [
    { title: "Overdue invoices", subtitle: "Payment follow-up", count: snapshot.overdueCount, icon: Clock3, color: "bg-amber-50 text-amber-800", module: "invoices", status: "Overdue" },
    { title: "Open quotations", subtitle: "Drafts & sent quotations", count: snapshot.pendingQuotes, icon: FileText, color: "bg-primary-light text-primary", module: "quotations", status: "Open" },
    { title: "Ready for dispatch", subtitle: "Delivery challans", count: snapshot.readyDeliveries, icon: Truck, color: "bg-sky-50 text-sky-700", module: "delivery", status: "Ready" },
  ];
  return <section aria-labelledby="attention-heading" className="min-w-0 rounded-lg border border-zinc-200 bg-white-500 p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><h2 id="attention-heading" className="text-sm font-medium">Needs attention</h2><span className="text-xs text-zinc-400">Open items</span></div><ul className="mt-4 divide-y divide-zinc-100">{items.map(({ title, subtitle, count, icon: Icon, color, module, status }) => <li key={title}><button type="button" onClick={() => onNavigate(module, status)} className="group flex w-full items-center gap-3 rounded py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><span className={"flex h-10 w-10 shrink-0 items-center justify-center rounded-md " + color}><Icon className="h-4 w-4" aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-medium text-zinc-700 group-hover:text-primary">{title}</span><span className="mt-1 block text-xs text-zinc-500">{subtitle}</span></span><span className="text-lg font-medium tabular-nums text-zinc-800">{String(count).padStart(2, "0")}</span><ArrowRight className="h-3.5 w-3.5 shrink-0 text-zinc-400 group-hover:text-primary" aria-hidden="true" /></button></li>)}</ul></section>;
}

export function SalesActivity() {
  return <section aria-labelledby="activity-heading" className="border-t border-zinc-200 pt-6"><h2 id="activity-heading" className="text-sm font-medium">Today&apos;s activity</h2><ul className="mt-5 grid gap-5 md:grid-cols-3">{prototypeActivity.map((entry) => { const Icon = documentIcons[entry.type] || CircleCheck; return <li key={entry.id} className="flex min-w-0 items-start gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white-500 text-zinc-500"><Icon className="h-4 w-4" aria-hidden="true" /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-medium text-zinc-700">{entry.label}</span><time className="text-[10px] text-zinc-400">{entry.time}</time></div><p className="mt-1 break-words text-xs leading-5 text-zinc-500">{entry.detail}</p></div></li>; })}</ul></section>;
}
