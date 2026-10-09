import { useEffect, useState } from "react";
import { Building2, ChevronLeft, ChevronRight, LoaderCircle, Package, Plus, Search, Users, X } from "lucide-react";
import { quotationRequest } from "../../lib/quotations/browser";
import { formatQuotationAmount, MAX_QUOTATION_ITEMS } from "../../utils/adminQuotation";
import PrototypeDialog from "./PrototypeDialog";

const tools = "flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40";
const names = { business: "business", customer: "customer", product: "products" };
const icons = { business: Building2, customer: Users, product: Package };

export default function QuotationPicker({ kind, onClose, onSelect, existingProducts = [] }) {
  const [search, setSearch] = useState(""); const [page, setPage] = useState(1);
  const [result, setResult] = useState({ items: [], count: 0 }); const [loading, setLoading] = useState(true);
  const [error, setError] = useState(""); const [selected, setSelected] = useState([]);
  const Icon = icons[kind]; const products = kind === "product";
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError("");
    const timer = setTimeout(() => {
      quotationRequest("/api/admin/quotations/options?" + new URLSearchParams({ kind, search, page: String(page) }), { signal: controller.signal })
        .then((data) => { if (!controller.signal.aborted) setResult(data); })
        .catch((cause) => { if (!controller.signal.aborted) setError(cause.message); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [kind, search, page]);
  const choose = (record) => { if (!products) { onSelect(record); onClose(); return; } setSelected((items) => items.some((item) => item.id === record.id) ? items.filter((item) => item.id !== record.id) : [...items, record]); };
  return <PrototypeDialog open onClose={onClose} labelledBy="quotation-picker-heading">
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white-500 p-4 sm:px-6"><div className="flex items-center justify-between gap-3"><h2 id="quotation-picker-heading" className="text-lg font-medium">Choose {names[kind]}</h2><button type="button" onClick={onClose} aria-label="Close selection" title="Close selection" className={tools}><X className="h-5 w-5" aria-hidden="true" /></button></div><div className="relative mt-3"><Search className="absolute left-3 top-3.5 h-4 w-4 text-zinc-400" aria-hidden="true" /><input autoFocus type="search" maxLength={100} aria-label={"Search " + names[kind]} placeholder={"Search " + names[kind] + "..."} value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="h-11 w-full min-w-0 rounded-md border border-zinc-200 bg-white-500 pl-9 pr-3 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:text-sm" /></div></header>
    <div className="min-h-[200px] px-4 py-2 sm:px-6">
      {loading ? <div role="status" className="flex min-h-[200px] items-center justify-center gap-2 text-sm text-zinc-500"><LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />Loading...</div> : error ? <p role="alert" className="py-6 text-sm text-primary">{error}</p> : !result.items.length ? <div className="py-6 text-center"><p className="text-sm text-zinc-500">No matching {names[kind]}.</p><a href={kind === "business" ? "/admin/businesses" : kind === "customer" ? "/admin/customers" : "/admin/products"} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded px-3 text-sm font-medium text-primary focus-visible:ring-2 focus-visible:ring-primary"><Plus className="h-4 w-4" aria-hidden="true" />Create {kind}</a></div> : <ul className="divide-y divide-zinc-100">{result.items.map((record) => {
        const checked = selected.some((item) => item.id === record.id);
        const added = products && existingProducts.includes(record.id);
        const disabled = record.deletion_pending || products && (added || !checked && selected.length + existingProducts.length >= MAX_QUOTATION_ITEMS);
        const details = <><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-500"><Icon className="h-5 w-5" aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block break-words text-sm font-medium text-zinc-900">{record.name}</span><span className="mt-1 block break-words text-xs leading-5 text-zinc-500">{products ? formatQuotationAmount(record.price) : kind === "customer" ? record.company_name : record.ntn}</span>{kind === "customer" && <span className="block break-all text-xs leading-5 text-zinc-400">{record.phone}</span>}{disabled && <span className="mt-1 block text-xs text-zinc-400">{added ? "Added" : record.deletion_pending ? "Pending deletion" : "Item limit reached"}</span>}</span></>;
        return <li key={record.id}>{products ? <label className={"flex min-h-[64px] items-center gap-3 rounded-md px-2 py-3 " + (disabled ? "opacity-50" : "cursor-pointer hover:bg-zinc-50")}><input type="checkbox" checked={checked} disabled={disabled} onChange={() => choose(record)} className="h-5 w-5 shrink-0 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" />{details}</label> : <button type="button" disabled={disabled} onClick={() => choose(record)} className="flex min-h-[64px] w-full items-start gap-3 rounded-md px-2 py-3 text-left hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50">{details}</button>}</li>;
      })}</ul>}
    </div>
    {!loading && !error && result.count > 12 && <div className="flex items-center justify-center gap-3 border-t border-zinc-100 px-4 py-2 text-xs text-zinc-500"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className={tools} title="Previous records" aria-label="Previous records"><ChevronLeft className="h-4 w-4" aria-hidden="true" /></button><span>{page} / {Math.ceil(result.count / 12)}</span><button type="button" disabled={page * 12 >= result.count} onClick={() => setPage((value) => value + 1)} className={tools} title="Next records" aria-label="Next records"><ChevronRight className="h-4 w-4" aria-hidden="true" /></button></div>}
    {products && <footer className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-zinc-200 bg-white-500 p-4 sm:px-6"><button type="button" onClick={onClose} className="min-h-[44px] rounded-md border border-zinc-200 px-4 text-sm text-zinc-700 focus-visible:ring-2 focus-visible:ring-primary">Cancel</button><button type="button" disabled={!selected.length} onClick={() => { onSelect(selected); onClose(); }} className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40"><Plus className="h-4 w-4" aria-hidden="true" />Add{selected.length ? " " + selected.length : ""}</button></footer>}
  </PrototypeDialog>;
}
