import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, LoaderCircle, Mail, MapPin, Pencil, Phone, Plus, RefreshCw, Search, Trash2, UserRound, Users, X } from "lucide-react";
import { CUSTOMER_PAGE_SIZE } from "../../utils/adminCustomer";
import { customerRequest } from "../../lib/customers/browser";
import CustomerDialog from "./CustomerDialog";

const toolClass = "flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40";
const primaryClass = "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

function CustomerTools({ record, onSelect }) {
  return <div className="flex shrink-0 items-center gap-1">{[{ mode: "view", label: "View", Icon: Eye }, { mode: "edit", label: "Edit", Icon: Pencil }, { mode: "delete", label: "Delete", Icon: Trash2 }].map(({ mode, label, Icon }) => <button key={mode} type="button" onClick={() => onSelect({ id: record.id, mode })} className={toolClass + (mode === "delete" ? " text-primary" : "")} title={label + " customer"} aria-label={label + " " + record.name}><Icon className="h-[18px] w-[18px]" aria-hidden="true" /></button>)}</div>;
}

function CustomerIdentity({ record }) {
  return <div className="flex min-w-0 items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-500"><UserRound className="h-5 w-5" aria-hidden="true" /></span><div className="min-w-0"><span className="block break-words text-sm font-medium text-zinc-900">{record.name}</span><span className="mt-1 block break-words text-xs leading-5 text-zinc-500">{record.company_name}</span></div></div>;
}

function CustomerContact({ record, mobile = false }) {
  const linkClass = "inline-flex max-w-full items-center gap-2 text-zinc-600 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary " + (mobile ? "min-h-[44px] text-sm" : "min-h-[32px] text-xs");
  return <div className="min-w-0 space-y-1"><a href={"mailto:" + encodeURIComponent(record.email)} className={linkClass}>{mobile && <Mail className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />}<span className="min-w-0 break-all">{record.email}</span></a><br /><a href={"tel:" + record.phone.replace(/[^+\d]/g, "")} className={linkClass}>{mobile && <Phone className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />}<span className="min-w-0 break-all">{record.phone}</span></a></div>;
}

export default function Customers() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ items: [], count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [selection, setSelection] = useState(null);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError("");
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ search: search.trim().slice(0, 100), page: String(page) });
      customerRequest("/api/admin/customers?" + params, { signal: controller.signal })
        .then((data) => {
          if (controller.signal.aborted) return;
          const lastPage = Math.max(1, Math.ceil(data.count / CUSTOMER_PAGE_SIZE));
          if (page > lastPage) { setPage(lastPage); return; }
          setResult(data);
        })
        .catch((cause) => { if (!controller.signal.aborted) setError(cause.message); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [search, page, refresh]);
  useEffect(() => {
    const focus = () => { if (document.visibilityState === "visible" && !selection) setRefresh((value) => value + 1); };
    window.addEventListener("focus", focus); return () => window.removeEventListener("focus", focus);
  }, [selection]);
  const pages = Math.max(1, Math.ceil(result.count / CUSTOMER_PAGE_SIZE));
  const create = () => setSelection({ mode: "create" });

  return <section aria-label="Customer directory" className="min-w-0 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="relative w-full min-w-0 sm:max-w-sm"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-zinc-400" aria-hidden="true" /><input type="search" aria-label="Search customers" placeholder="Search customers..." maxLength={100} value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="h-11 w-full min-w-0 rounded-md border border-zinc-200 bg-white-500 pl-9 pr-11 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:text-sm" />{search && <button type="button" className={toolClass + " absolute right-0 top-0"} aria-label="Clear customer search" title="Clear search" onClick={() => { setSearch(""); setPage(1); }}><X className="h-4 w-4" aria-hidden="true" /></button>}</div>
      <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto"><span className="text-xs tabular-nums text-zinc-500 lg:hidden">{loading ? "Loading..." : error ? "" : `${result.count} ${result.count === 1 ? "customer" : "customers"}`}</span><div className="ml-auto flex items-center gap-2"><button type="button" disabled={loading} className={toolClass} onClick={() => setRefresh((value) => value + 1)} title="Refresh customers" aria-label="Refresh customers"><RefreshCw className="h-4 w-4" aria-hidden="true" /></button><button type="button" onClick={create} className={primaryClass}><Plus className="h-4 w-4 shrink-0" aria-hidden="true" />Create customer</button></div></div>
    </div>
    {notice && <div role="status" className="flex items-start justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm leading-6 text-emerald-800"><span className="min-w-0 py-2">{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="Dismiss customer notification" title="Dismiss notification" className={toolClass}><X className="h-4 w-4" aria-hidden="true" /></button></div>}
    {loading ? <div role="status" className="flex min-h-[260px] items-center justify-center gap-2 text-sm text-zinc-500"><LoaderCircle className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />Loading customers...</div> : error ? <div role="alert" className="border-y border-zinc-200 bg-white-500 px-4 py-6"><p className="text-sm leading-6 text-primary">{error}</p><button type="button" onClick={() => setRefresh((value) => value + 1)} className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-md border border-zinc-200 px-4 text-sm text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><RefreshCw className="h-4 w-4" aria-hidden="true" />Retry</button></div> : !result.items.length ? <div className="flex min-h-[280px] flex-col items-center justify-center border-y border-zinc-200 bg-white-500 px-4 py-8 text-center"><Users className="mb-3 h-8 w-8 text-zinc-300" aria-hidden="true" /><h2 className="text-base font-medium">{search ? "No matching customers" : "No customers yet"}</h2>{!search && <button type="button" onClick={create} className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-md px-4 text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Plus className="h-4 w-4" aria-hidden="true" />Create customer</button>}</div> : <>
      <ul className="grid gap-3 lg:hidden">{result.items.map((record) => <li key={record.id} className="min-w-0 rounded-lg border border-zinc-200 bg-white-500 p-4"><CustomerIdentity record={record} /><div className="mt-3"><CustomerContact record={record} mobile /></div><div className="mt-2 flex items-start gap-2 text-sm leading-6 text-zinc-500"><MapPin className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" /><span className="min-w-0 whitespace-pre-wrap break-words">{record.address}</span></div><div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3"><span className="text-xs text-zinc-400">Customer details</span><CustomerTools record={record} onSelect={setSelection} /></div></li>)}</ul>
      <div className="hidden overflow-hidden rounded-lg border border-zinc-200 bg-white-500 lg:block">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4"><h2 className="text-sm font-medium">Customer directory</h2><span className="text-xs tabular-nums text-zinc-500">{result.count} {result.count === 1 ? "customer" : "customers"}</span></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[840px] table-fixed text-left text-sm"><caption className="sr-only">Customers, companies and contact details</caption><thead className="border-b border-zinc-100 bg-zinc-50 text-xs text-zinc-500"><tr><th scope="col" className="w-[32%] px-5 py-3 font-medium">Customer</th><th scope="col" className="w-[26%] px-4 py-3 font-medium">Contact</th><th scope="col" className="px-4 py-3 font-medium">Address</th><th scope="col" className="w-[150px] px-4 py-3"><span className="sr-only">Actions</span></th></tr></thead><tbody className="divide-y divide-zinc-100">{result.items.map((record) => <tr key={record.id} className="hover:bg-zinc-50/60"><td className="px-5 py-5 align-top"><CustomerIdentity record={record} /></td><td className="px-4 py-5 align-top"><CustomerContact record={record} /></td><td className="break-words px-4 py-5 align-top text-xs leading-5 text-zinc-500">{record.address.length > 120 ? record.address.slice(0, 120).trimEnd() + "..." : record.address}</td><td className="px-2 py-5 align-top"><CustomerTools record={record} onSelect={setSelection} /></td></tr>)}</tbody></table></div>
      </div>
    </>}
    {!loading && !error && result.count > 0 && <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 pt-3 text-xs text-zinc-500"><span>{(page - 1) * CUSTOMER_PAGE_SIZE + 1}-{Math.min(page * CUSTOMER_PAGE_SIZE, result.count)} of {result.count}</span><div className="flex items-center gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className={toolClass} title="Previous customers" aria-label="Previous customers"><ChevronLeft className="h-4 w-4" aria-hidden="true" /></button><span className="tabular-nums">{page} / {pages}</span><button type="button" disabled={page >= pages} onClick={() => setPage((value) => value + 1)} className={toolClass} title="Next customers" aria-label="Next customers"><ChevronRight className="h-4 w-4" aria-hidden="true" /></button></div></div>}
    {selection && <CustomerDialog key={selection.id || "create"} selection={selection} onClose={() => setSelection(null)} onChanged={(message) => { setNotice(message); setRefresh((value) => value + 1); }} />}
  </section>;
}
