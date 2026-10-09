import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, LoaderCircle, Package, Pencil, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import { formatProductPrice, PRODUCT_PAGE_SIZE } from "../../utils/adminProduct";
import { productRequest } from "../../lib/products/browser";
import ProductDialog from "./ProductDialog";

const toolClass = "flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40";
const primaryClass = "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

function ProductTools({ record, onSelect }) {
  return <div className="flex shrink-0 items-center gap-1">{[{ mode: "view", label: "View", Icon: Eye }, { mode: "edit", label: "Edit", Icon: Pencil }, { mode: "delete", label: "Delete", Icon: Trash2 }].map(({ mode, label, Icon }) => <button key={mode} type="button" onClick={() => onSelect({ id: record.id, mode })} className={toolClass + (mode === "delete" ? " text-primary" : "")} title={label + " product"} aria-label={label + " " + record.name}><Icon className="h-[18px] w-[18px]" aria-hidden="true" /></button>)}</div>;
}

function ProductIdentity({ record }) {
  return <div className="flex min-w-0 items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-500"><Package className="h-5 w-5" aria-hidden="true" /></span><span className="min-w-0 break-words pt-2 text-sm font-medium leading-6 text-zinc-900">{record.name}</span></div>;
}

export default function Products() {
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
      productRequest("/api/admin/products?" + params, { signal: controller.signal })
        .then((data) => {
          if (controller.signal.aborted) return;
          const lastPage = Math.max(1, Math.ceil(data.count / PRODUCT_PAGE_SIZE));
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
  const pages = Math.max(1, Math.ceil(result.count / PRODUCT_PAGE_SIZE));
  const create = () => setSelection({ mode: "create" });

  return <section aria-label="Product catalogue" className="min-w-0 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="relative w-full min-w-0 sm:max-w-sm"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-zinc-400" aria-hidden="true" /><input type="search" aria-label="Search products" placeholder="Search products..." maxLength={100} value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="h-11 w-full min-w-0 rounded-md border border-zinc-200 bg-white-500 pl-9 pr-11 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:text-sm" />{search && <button type="button" className={toolClass + " absolute right-0 top-0"} aria-label="Clear product search" title="Clear search" onClick={() => { setSearch(""); setPage(1); }}><X className="h-4 w-4" aria-hidden="true" /></button>}</div>
      <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto"><span className="text-xs tabular-nums text-zinc-500 lg:hidden">{loading ? "Loading..." : error ? "" : `${result.count} ${result.count === 1 ? "product" : "products"}`}</span><div className="ml-auto flex items-center gap-2"><button type="button" disabled={loading} className={toolClass} onClick={() => setRefresh((value) => value + 1)} title="Refresh products" aria-label="Refresh products"><RefreshCw className="h-4 w-4" aria-hidden="true" /></button><button type="button" onClick={create} className={primaryClass}><Plus className="h-4 w-4 shrink-0" aria-hidden="true" />Create product</button></div></div>
    </div>
    {notice && <div role="status" className="flex items-start justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm leading-6 text-emerald-800"><span className="min-w-0 py-2">{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="Dismiss product notification" title="Dismiss notification" className={toolClass}><X className="h-4 w-4" aria-hidden="true" /></button></div>}
    {loading ? <div role="status" className="flex min-h-[260px] items-center justify-center gap-2 text-sm text-zinc-500"><LoaderCircle className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />Loading products...</div> : error ? <div role="alert" className="border-y border-zinc-200 bg-white-500 px-4 py-6"><p className="text-sm leading-6 text-primary">{error}</p><button type="button" onClick={() => setRefresh((value) => value + 1)} className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-md border border-zinc-200 px-4 text-sm text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><RefreshCw className="h-4 w-4" aria-hidden="true" />Retry</button></div> : !result.items.length ? <div className="flex min-h-[280px] flex-col items-center justify-center border-y border-zinc-200 bg-white-500 px-4 py-8 text-center"><Package className="mb-3 h-8 w-8 text-zinc-300" aria-hidden="true" /><h2 className="text-base font-medium">{search ? "No matching products" : "No products yet"}</h2>{!search && <button type="button" onClick={create} className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-md px-4 text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Plus className="h-4 w-4" aria-hidden="true" />Create product</button>}</div> : <>
      <ul className="grid gap-3 lg:hidden">{result.items.map((record) => <li key={record.id} className="min-w-0 rounded-lg border border-zinc-200 bg-white-500 p-4"><ProductIdentity record={record} /><dl className="mt-4"><dt className="text-xs text-zinc-500">Price</dt><dd className="mt-1 break-words text-base font-medium tabular-nums text-zinc-900">{formatProductPrice(record.price)}</dd></dl><div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3"><span className="text-xs text-zinc-400">Product details</span><ProductTools record={record} onSelect={setSelection} /></div></li>)}</ul>
      <div className="hidden overflow-hidden rounded-lg border border-zinc-200 bg-white-500 lg:block">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4"><h2 className="text-sm font-medium">Product catalogue</h2><span className="text-xs tabular-nums text-zinc-500">{result.count} {result.count === 1 ? "product" : "products"}</span></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[640px] table-fixed text-left text-sm"><caption className="sr-only">Products and whole-number prices in Pakistani rupees</caption><thead className="border-b border-zinc-100 bg-zinc-50 text-xs text-zinc-500"><tr><th scope="col" className="px-5 py-3 font-medium">Name</th><th scope="col" className="w-[210px] px-4 py-3 text-right font-medium">Price (PKR)</th><th scope="col" className="w-[150px] px-4 py-3"><span className="sr-only">Actions</span></th></tr></thead><tbody className="divide-y divide-zinc-100">{result.items.map((record) => <tr key={record.id} className="hover:bg-zinc-50/60"><th scope="row" className="px-5 py-4 text-left font-normal"><ProductIdentity record={record} /></th><td className="break-words px-4 py-4 text-right font-medium tabular-nums text-zinc-900">{formatProductPrice(record.price)}</td><td className="px-2 py-4"><ProductTools record={record} onSelect={setSelection} /></td></tr>)}</tbody></table></div>
      </div>
    </>}
    {!loading && !error && result.count > 0 && <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 pt-3 text-xs text-zinc-500"><span>{(page - 1) * PRODUCT_PAGE_SIZE + 1}-{Math.min(page * PRODUCT_PAGE_SIZE, result.count)} of {result.count}</span><div className="flex items-center gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className={toolClass} title="Previous products" aria-label="Previous products"><ChevronLeft className="h-4 w-4" aria-hidden="true" /></button><span className="tabular-nums">{page} / {pages}</span><button type="button" disabled={page >= pages} onClick={() => setPage((value) => value + 1)} className={toolClass} title="Next products" aria-label="Next products"><ChevronRight className="h-4 w-4" aria-hidden="true" /></button></div></div>}
    {selection && <ProductDialog key={selection.id || "create"} selection={selection} onClose={() => setSelection(null)} onChanged={(message) => { setNotice(message); setRefresh((value) => value + 1); }} />}
  </section>;
}
