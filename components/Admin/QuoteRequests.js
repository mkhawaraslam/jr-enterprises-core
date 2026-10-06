import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, Inbox, LoaderCircle, Paperclip, RefreshCw } from "lucide-react";
import { QUOTE_PAGE_SIZE } from "../../utils/quoteRequest";
import { adminQuoteRequest } from "../../lib/quotes/adminBrowser";
import QuoteRequestDetails, { formatQuoteReceived, quotePhoneLink } from "./QuoteRequestDetails";
import QuoteRequestStatus, { NewQuoteBadge } from "./QuoteRequestStatus";
import { iconButtonClass } from "./SalesDocuments";

const filters = [{ id: "all", label: "All" }, { id: "new", label: "New" }, { id: "reviewed", label: "Reviewed" }];

export default function QuoteRequests({ query = "", counts = {} }) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [result, setResult] = useState({ items: [], count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  useEffect(() => { setPage(1); }, [query, status]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ page: String(page), search: query.trim().slice(0, 100), status });
      adminQuoteRequest("/api/admin/quote-requests?" + params, { signal: controller.signal })
        .then((data) => {
          if (controller.signal.aborted) return;
          if (page > Math.max(1, Math.ceil(data.count / QUOTE_PAGE_SIZE))) { setPage(1); return; }
          setResult(data);
        })
        .catch((cause) => { if (!controller.signal.aborted) setError(cause.message); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, page, status, refresh, counts.revision]);
  const pages = Math.max(1, Math.ceil(result.count / QUOTE_PAGE_SIZE));
  const refreshRequests = () => { setRefresh((value) => value + 1); counts.refresh?.(); };
  const filterCount = (id) => counts.total == null ? null : id === "all" ? counts.total : id === "new" ? counts.unreviewed : counts.total - counts.unreviewed;

  return <>
    {counts.error && <p role="status" className="text-xs leading-relaxed text-amber-700">New-request counts are unavailable. {counts.error}</p>}
    <section aria-labelledby="quote-requests-list-heading" aria-busy={loading} className="min-w-0 overflow-hidden rounded-lg border border-zinc-200 bg-white-500">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4"><div className="flex flex-wrap items-center gap-3"><h2 id="quote-requests-list-heading" className="text-sm font-medium">Received requests</h2><NewQuoteBadge count={counts.unreviewed} /></div><button type="button" disabled={loading} onClick={refreshRequests} className={iconButtonClass + " disabled:opacity-40"} title="Refresh requests" aria-label="Refresh requests"><RefreshCw className="h-4 w-4" aria-hidden="true" /></button></div>
      <div role="group" aria-label="Request review status" className="flex flex-wrap gap-5 border-b border-zinc-100 px-5">{filters.map((filter) => <button type="button" key={filter.id} aria-pressed={status === filter.id} onClick={() => { setStatus(filter.id); setPage(1); }} className={"inline-flex min-h-[2.75rem] items-center gap-2 border-b-2 py-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary " + (status === filter.id ? "border-primary font-medium text-primary" : "border-transparent text-zinc-500 hover:text-zinc-800")}>{filter.label}{filterCount(filter.id) != null && <span className="text-[10px] tabular-nums">{filterCount(filter.id)}</span>}</button>)}</div>
      {error ? <div className="px-5 py-8"><p role="alert" className="text-sm text-primary">{error}</p><button type="button" onClick={refreshRequests} className="mt-4 rounded text-xs text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Retry</button></div> : <div className="relative overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-xs"><caption className="sr-only">Submitted website quote requests, newest first. New and reviewed status is shared across the team.</caption><thead className="border-b border-zinc-100 bg-zinc-50 text-[10px] uppercase text-zinc-500"><tr><th scope="col" className="px-5 py-3 font-medium">Customer</th><th scope="col" className="px-5 py-3 font-medium">Contact</th><th scope="col" className="px-5 py-3 font-medium">Product requirements</th><th scope="col" className="px-3 py-3 font-medium">Status</th><th scope="col" className="px-5 py-3 font-medium">Received</th><th scope="col" className="px-5 py-3"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{loading ? <tr><td colSpan={6} className="px-5 py-12"><div role="status" className="flex items-center justify-center gap-2 text-zinc-500"><LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />Loading requests...</div></td></tr> : result.items.length ? result.items.map((request) => <tr key={request.id} className={"border-b border-zinc-100 last:border-0 hover:bg-zinc-50/60 " + (!request.reviewed_at ? "bg-primary-light/30" : "")}><td className="px-5 py-5"><button type="button" onClick={() => setSelectedId(request.id)} className="max-w-[180px] break-words rounded text-left font-medium text-zinc-900 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{request.full_name}</button><div className="mt-2 text-[10px] text-zinc-400">{request.id.slice(0, 8).toUpperCase()}</div></td><td className="px-5 py-5"><a href={quotePhoneLink(request.phone)} className="rounded text-zinc-700 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{request.phone}</a><div className="mt-2 max-w-[180px] truncate text-[11px] text-zinc-500" title={request.email || undefined}>{request.email || "No email"}</div></td><td className="px-5 py-5"><p className="max-w-[240px] truncate text-zinc-600" title={request.requirements}>{request.requirements}</p>{request.photos.length > 0 ? <span className="mt-2 inline-flex items-center gap-1.5 text-[10px] text-zinc-400"><Paperclip className="h-3 w-3" aria-hidden="true" />{request.photos.length} {request.photos.length === 1 ? "photo" : "photos"}</span> : request.photos_removed_at && <span className="mt-2 block text-[10px] text-zinc-400">Photos removed</span>}</td><td className="px-3 py-5"><QuoteRequestStatus request={request} /></td><td className="whitespace-nowrap px-5 py-5 text-[11px] text-zinc-500"><time dateTime={request.submitted_at}>{formatQuoteReceived(request.submitted_at)}</time></td><td className="px-5 py-5"><button type="button" onClick={() => setSelectedId(request.id)} className={iconButtonClass} title="View request" aria-label={"View request from " + request.full_name}><Eye className="h-4 w-4" aria-hidden="true" /></button></td></tr>) : <tr><td colSpan={6} className="px-5 py-14 text-center"><Inbox className="mx-auto mb-3 h-6 w-6 text-zinc-300" aria-hidden="true" /><p className="text-sm text-zinc-500">{query ? "No matching requests." : status === "new" ? "All requests have been reviewed." : status === "reviewed" ? "No reviewed requests yet." : "No quote requests yet."}</p></td></tr>}</tbody>
        </table>
      </div>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 px-5 py-4 text-[11px] text-zinc-500"><span>{loading ? "Loading..." : error ? "" : result.count ? `${(page - 1) * QUOTE_PAGE_SIZE + 1}-${Math.min(page * QUOTE_PAGE_SIZE, result.count)} of ${result.count} requests` : "0 requests"}</span><div className="flex items-center gap-3"><button type="button" disabled={loading || Boolean(error) || page <= 1} onClick={() => setPage((value) => value - 1)} className={iconButtonClass + " disabled:opacity-30"} aria-label="Previous requests page" title="Previous page"><ChevronLeft className="h-4 w-4" aria-hidden="true" /></button><span className="tabular-nums">{page} / {pages}</span><button type="button" disabled={loading || Boolean(error) || page >= pages} onClick={() => setPage((value) => value + 1)} className={iconButtonClass + " disabled:opacity-30"} aria-label="Next requests page" title="Next page"><ChevronRight className="h-4 w-4" aria-hidden="true" /></button></div></div>
    </section>
    <QuoteRequestDetails id={selectedId} onClose={() => setSelectedId(null)} onChanged={() => setRefresh((value) => value + 1)} />
  </>;
}
