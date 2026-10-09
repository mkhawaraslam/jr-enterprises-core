import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { ArrowRight, Bell, Building2, Download, ExternalLink, FileText, Inbox, LayoutDashboard, Menu, Package, Receipt, Search, Truck, Users, X } from "lucide-react";
import logo from "../../public/assets/jr-logo.png";
import { documentsToCsv, filterDocuments, getSalesSnapshot, prototypeCustomers, prototypePeriods, prototypeProducts } from "../../data/salesPrototype";
import PrototypeDialog from "./PrototypeDialog";
import SalesDocuments, { DocumentPreview, iconButtonClass } from "./SalesDocuments";
import SalesModulePreview from "./SalesModulePreview";
import { SalesActivity, SalesAttention, SalesPerformance, SalesSnapshot } from "./SalesOverview";
import AccountMenu from "./AccountMenu";
import QuoteRequests from "./QuoteRequests";
import Businesses from "./Businesses";
import Customers from "./Customers";
import Products from "./Products";
import Quotations from "./Quotations";
import useQuoteRequestCounts from "./useQuoteRequestCounts";
import { NewQuoteBadge } from "./QuoteRequestStatus";

const modules = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  { id: "business", label: "Business", icon: Building2 },
  { id: "customers", label: "Customers", icon: Users },
  { id: "products", label: "Products", icon: Package },
  { id: "requests", label: "Quote Requests", icon: Inbox },
  { id: "quotations", label: "Quotations", icon: FileText },
  { id: "invoices", label: "Invoices", icon: Receipt },
  { id: "delivery", label: "Delivery Challans", icon: Truck },
];
const moduleTypes = { quotations: "Quotation", invoices: "Invoice", delivery: "Delivery Challan" };
const moduleRoutes = { requests: "/admin/quote-requests", business: "/admin/businesses", customers: "/admin/customers", products: "/admin/products", quotations: "/admin/quotations" };
const documentFilters = [
  { value: "All", label: "All documents" },
  { value: "Quotation", label: "Quotations" },
  { value: "Invoice", label: "Invoices" },
  { value: "Delivery Challan", label: "Challans" },
];
const statuses = {
  All: ["Open", "Draft", "Sent", "Accepted", "Unpaid", "Paid", "Overdue", "Ready", "Delivered"],
  Quotation: ["Open", "Draft", "Sent", "Accepted"],
  Invoice: ["Unpaid", "Paid", "Overdue"],
  "Delivery Challan": ["Ready", "Delivered"],
};
const selectClass = "min-h-[2.25rem] max-w-full rounded-md border border-zinc-200 bg-white-500 py-2 pl-3 pr-7 text-xs text-zinc-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";
const primaryButtonClass = "inline-flex min-h-[2.5rem] items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

function Sidebar({ active, onNavigate, onClose, quoteCount, newRequestCount }) {
  return <div className="flex h-full flex-col overflow-y-auto">
    <div className="flex min-h-[81px] items-center justify-between gap-2 border-b border-zinc-100 px-5"><a href="/" aria-label="J.R Enterprises homepage" className="relative block h-12 w-44 max-w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Image src={logo} alt="J.R Enterprises" layout="fill" objectFit="contain" sizes="176px" priority /></a>{onClose && <button type="button" onClick={onClose} className={iconButtonClass} title="Close navigation" aria-label="Close navigation"><X className="h-5 w-5" aria-hidden="true" /></button>}</div>
    <button type="button" onClick={() => onNavigate("business")} className="mx-5 mb-3 mt-7 flex items-center gap-3 rounded py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-600"><Building2 className="h-4 w-4" aria-hidden="true" /></span><span className="min-w-0"><span className="block text-xs font-medium text-zinc-800">JR Enterprises</span><span className="mt-1 block text-[11px] text-zinc-400">Sales workspace</span></span></button>
    <nav aria-label="Sales workspace navigation" className="px-3 py-3">
      {modules.map(({ id, label, icon: Icon }) => <div key={id}>{id === "business" && <div className="mb-2 mt-7 px-3 text-[10px] font-medium uppercase text-zinc-400">Workspace</div>}{id === "quotations" && <div className="mb-2 mt-7 px-3 text-[10px] font-medium uppercase text-zinc-400">Sales documents</div>}<button type="button" onClick={() => onNavigate(id)} aria-current={active === id ? "page" : undefined} className={"my-1 flex min-h-[2.75rem] w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary " + (active === id ? "bg-primary-light font-medium text-primary" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900")}><Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" /><span>{label}</span>{id === "requests" && newRequestCount > 0 && <span className="ml-auto"><NewQuoteBadge count={newRequestCount} /></span>}{id === "quotations" && quoteCount != null && <span className={"ml-auto min-w-[1.5rem] rounded px-1.5 py-0.5 text-center text-[10px] tabular-nums " + (active === id ? "bg-primary/10 text-primary" : "bg-zinc-100 text-zinc-500")}>{quoteCount}</span>}</button></div>)}
    </nav>
    <div className="mt-auto border-t border-zinc-100 p-5"><a href="/" className="flex items-center justify-between rounded text-xs text-zinc-500 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Company website<ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></a><div className="mt-4 text-[10px] text-zinc-400">JR Enterprises / 2026</div></div>
  </div>;
}

export default function SalesDashboard({ user, initialModule = "overview", heading, children }) {
  const router = useRouter();
  const [active, setActive] = useState(initialModule);
  useEffect(() => { setActive(initialModule); }, [initialModule]);
  const [period, setPeriod] = useState("october");
  const [query, setQuery] = useState("");
  const [type, setType] = useState("All");
  const [status, setStatus] = useState("All");
  const [page, setPage] = useState(1);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [exportNotice, setExportNotice] = useState("");
  const requestCounts = useQuoteRequestCounts();
  const activeModule = modules.find((module) => module.id === active);
  const currentType = moduleTypes[active] || type;
  const isDocuments = active === "overview" || Boolean(moduleTypes[active]) && !moduleRoutes[active];
  const isDirectory = active === "business" || active === "customers" || active === "products" || active === "quotations";
  const snapshot = getSalesSnapshot(period);
  const documents = filterDocuments({ period, type: currentType, status, query });
  const baseDocuments = filterDocuments({ period, query });
  const quoteCount = filterDocuments({ period, type: "Quotation" }).length;
  const searchLabel = isDocuments ? "Search documents" : `Search ${activeModule.label.toLowerCase()}`;

  const navigate = (module, nextStatus = "All") => {
    setMobileOpen(false);
    if (moduleRoutes[module]) { if (active !== module) router.push(moduleRoutes[module]); return; }
    if (moduleRoutes[active]) { router.push(module === "overview" ? "/admin/dashboard" : `/admin/dashboard?view=${module}`); return; }
    setActive(module);
    setType("All");
    setStatus(nextStatus);
    setQuery("");
    setPage(1);
    setMobileOpen(false);
    setExportNotice("");
  };
  const exportDocuments = () => {
    const url = URL.createObjectURL(new Blob(["\uFEFF" + documentsToCsv(documents)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "jr-sales-sample.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setExportNotice(`${documents.length} sample ${documents.length === 1 ? "document" : "documents"} exported`);
  };

  return <div className="min-h-screen bg-zinc-50 text-zinc-900">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-zinc-200 bg-white-500 lg:block"><Sidebar active={active} onNavigate={navigate} quoteCount={moduleRoutes[active] ? null : quoteCount} newRequestCount={requestCounts.unreviewed} /></aside>
    <PrototypeDialog open={mobileOpen} onClose={() => setMobileOpen(false)} labelledBy="mobile-navigation-heading" className="fixed bottom-0 left-0 top-0 m-0 h-full max-h-none w-72 max-w-[calc(100%-2rem)] rounded-none border-0"><h2 id="mobile-navigation-heading" className="sr-only">Sales navigation</h2><Sidebar active={active} onNavigate={navigate} onClose={() => setMobileOpen(false)} quoteCount={moduleRoutes[active] ? null : quoteCount} newRequestCount={requestCounts.unreviewed} /></PrototypeDialog>
    <div className="min-w-0 lg:pl-60">
      <header className="border-b border-zinc-200 bg-white-500">
        <div className="mx-auto flex min-h-[81px] max-w-screen-2xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3"><button type="button" onClick={() => setMobileOpen(true)} className={iconButtonClass + " lg:hidden"} title="Open navigation" aria-label="Open navigation"><Menu className="h-5 w-5" aria-hidden="true" /></button><div className="hidden items-center gap-2 text-xs text-zinc-400 lg:flex"><span>Workspace</span><span aria-hidden="true">/</span><span className="text-zinc-700">{activeModule.label}</span></div><a href="/" aria-label="J.R Enterprises homepage" className="relative block h-8 w-32 sm:w-40 lg:hidden"><Image src={logo} alt="J.R Enterprises" layout="fill" objectFit="contain" sizes="160px" priority /></a></div>
          {!isDirectory && <div className="relative order-3 w-full md:order-none md:max-w-[260px] xl:max-w-xs"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-zinc-400" aria-hidden="true" /><input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); setExportNotice(""); }} aria-label={searchLabel} placeholder={searchLabel + "..."} className="h-10 w-full min-w-0 rounded-md border border-zinc-200 bg-zinc-50 pl-9 pr-9 text-xs placeholder:text-zinc-400 focus:border-primary focus:bg-white-500 focus:outline-none focus:ring-2 focus:ring-primary/20" />{query && <button type="button" onClick={() => { setQuery(""); setPage(1); }} aria-label="Clear search" title="Clear search" className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded text-zinc-400 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><X className="h-3.5 w-3.5" aria-hidden="true" /></button>}</div>}
          <div className="flex items-center gap-3 sm:gap-4">
            {!moduleRoutes[active] && <span className="hidden items-center gap-1.5 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-800 sm:inline-flex">Sample data</span>}
            <button type="button" onClick={() => navigate("requests")} aria-label={requestCounts.error ? "Quote request counts unavailable" : requestCounts.unreviewed === null ? "View quote requests" : `${requestCounts.unreviewed} unreviewed quote requests`} title={requestCounts.error || "View quote requests"} className={iconButtonClass + " relative"}><Bell className="h-[18px] w-[18px]" aria-hidden="true" />{requestCounts.unreviewed > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded bg-primary px-1 text-[9px] font-medium tabular-nums text-primary-foreground" aria-hidden="true">{requestCounts.unreviewed > 99 ? "99+" : requestCounts.unreviewed}</span>}</button>
            <AccountMenu user={user} />
          </div>
        </div>
      </header>
      <main id="sales-dashboard-content" className="mx-auto w-full min-w-0 max-w-screen-2xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
        <section aria-labelledby="dashboard-heading" className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 max-w-full">{!moduleRoutes[active] && <div className="mb-2 flex items-center gap-2 text-[10px] font-medium text-amber-800 sm:hidden"><span className="h-1.5 w-1.5 rounded-full bg-amber-600" aria-hidden="true" />Sample data</div>}<div className="flex flex-wrap items-center gap-3"><h1 id="dashboard-heading" className="min-w-0 break-all text-2xl font-medium leading-tight">{heading || activeModule.label}</h1>{active === "requests" && <NewQuoteBadge count={requestCounts.unreviewed} />}</div></div>
          <div className="flex max-w-full flex-wrap items-center gap-2">{isDocuments && <><label className="sr-only" htmlFor="sales-period">Reporting period</label><select id="sales-period" value={period} onChange={(event) => { setPeriod(event.target.value); setPage(1); setExportNotice(""); }} className={selectClass}>{prototypePeriods.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}</select><button type="button" onClick={exportDocuments} disabled={!documents.length} className={iconButtonClass + " h-10 w-10 border border-zinc-200 bg-white-500 disabled:cursor-not-allowed disabled:opacity-40"} title="Export sample documents as CSV" aria-label="Export sample documents as CSV"><Download className="h-4 w-4" aria-hidden="true" /></button></>}{active === "overview" && <button type="button" onClick={() => navigate("quotations")} className={primaryButtonClass}>View quotations<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></button>}</div>
        </section>
        {active === "overview" && <><SalesSnapshot snapshot={snapshot} /><div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]"><SalesPerformance /><SalesAttention snapshot={snapshot} onNavigate={navigate} /></div></>}
        {children || (active === "business" ? <Businesses /> : active === "customers" ? <Customers /> : active === "products" ? <Products /> : active === "quotations" ? <Quotations /> : active === "requests" ? <QuoteRequests query={query} counts={requestCounts} /> : isDocuments ? <section aria-labelledby="documents-heading" className="min-w-0 overflow-hidden rounded-lg border border-zinc-200 bg-white-500">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-5"><div className="flex items-center gap-3"><h2 id="documents-heading" className="text-sm font-medium">{active === "overview" ? "Recent documents" : activeModule.label}</h2><span className="text-xs tabular-nums text-zinc-400">{documents.length}</span></div><label className="sr-only" htmlFor="document-status">Document status</label><select id="document-status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); setExportNotice(""); }} className={selectClass}><option value="All">All statuses</option>{statuses[currentType].map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select></div>
          {active === "overview" && <div role="group" aria-label="Document type" className="flex flex-wrap gap-x-5 gap-y-1 px-5">{documentFilters.map((filter) => <button type="button" key={filter.value} aria-pressed={type === filter.value} onClick={() => { setType(filter.value); setStatus("All"); setPage(1); setExportNotice(""); }} className={"inline-flex min-h-[2.75rem] items-center gap-2 border-b-2 pb-3 pt-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary " + (type === filter.value ? "border-primary font-medium text-primary" : "border-transparent text-zinc-500 hover:text-zinc-800")}>{filter.label}<span className="text-[10px] tabular-nums opacity-70">{filter.value === "All" ? baseDocuments.length : baseDocuments.filter((document) => document.type === filter.value).length}</span></button>)}</div>}
          <SalesDocuments documents={documents} page={page} onPageChange={setPage} onView={setSelectedDocument} />
        </section> : <SalesModulePreview module={active} query={query} onView={setSelectedDocument} />)}
        {active === "overview" && <SalesActivity />}
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 pt-4 text-[10px] text-zinc-400"><span>JR Enterprises</span><span>{moduleRoutes[active] ? activeModule.label : <>Sales workspace <span aria-hidden="true">/</span> UI prototype</>}</span></footer>
      </main>
    </div>
    <DocumentPreview document={selectedDocument} onClose={() => setSelectedDocument(null)} />
    {exportNotice && <div role="status" className="fixed bottom-5 right-5 z-40 flex max-w-[calc(100vw-2.5rem)] items-center gap-3 rounded-md border border-zinc-200 bg-white-500 p-4 text-xs text-zinc-700 shadow-lg"><Download className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />{exportNotice}<button type="button" onClick={() => setExportNotice("")} title="Dismiss notification" aria-label="Dismiss notification" className={iconButtonClass}><X className="h-4 w-4" aria-hidden="true" /></button></div>}
  </div>;
}
