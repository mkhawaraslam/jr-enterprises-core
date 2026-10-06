import { useEffect, useRef, useState } from "react";
import { CheckCircle2, CircleDot, ExternalLink, ImageOff, LoaderCircle, Mail, Phone, RefreshCw, Trash2, X } from "lucide-react";
import { adminQuoteRequest, notifyQuoteRequestsChanged } from "../../lib/quotes/adminBrowser";
import { formatQuoteFileSize } from "../../utils/quoteRequest";
import PrototypeDialog from "./PrototypeDialog";
import QuoteRequestStatus from "./QuoteRequestStatus";
import { iconButtonClass } from "./SalesDocuments";

export const formatQuoteReceived = (value) => new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Karachi" }).format(new Date(value));
export const quotePhoneLink = (phone) => "tel:" + phone.replace(/[^\d+]/g, "");
const actionClass = "inline-flex min-h-[2.5rem] items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white-500 px-3 py-2 text-xs font-medium transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40";
const deleteClass = "inline-flex min-h-[2.5rem] items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-50";

export default function QuoteRequestDetails({ id, onClose, onChanged }) {
  const [request, setRequest] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [confirmation, setConfirmation] = useState(null);
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const busyRef = useRef(false);
  const cancelRef = useRef(null);
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  useEffect(() => { setConfirmation(null); setActionError(""); setNotice(""); }, [id]);
  useEffect(() => { if (confirmation) cancelRef.current?.focus(); }, [confirmation]);
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    setRequest(null); setError(""); setLoading(true);
    adminQuoteRequest("/api/admin/quote-requests/" + encodeURIComponent(id), { signal: controller.signal })
      .then((data) => { if (!controller.signal.aborted) setRequest(data); })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, refresh]);

  const close = () => { if (!busyRef.current) onClose(); };
  const mutate = async (action) => {
    if (busyRef.current || !request) return;
    busyRef.current = true; setPending(true); setActionError(""); setNotice("");
    const base = "/api/admin/quote-requests/" + encodeURIComponent(id);
    try {
      if (action === "review") await adminQuoteRequest(base + "/review", { method: "POST", body: { reviewed: !request.reviewed_at } });
      else await adminQuoteRequest(base + (action === "photos" ? "/photos" : ""), { method: "DELETE", body: { confirmation: action === "photos" ? "remove-photos" : "delete-request" } });
      notifyQuoteRequestsChanged();
      if (!mountedRef.current) return;
      onChanged();
      if (action === "request") onClose();
      else {
        setConfirmation(null); setRefresh((value) => value + 1);
        setNotice(action === "photos" ? "Product photos removed from Supabase Storage. Request details have been kept." : request.reviewed_at ? "Request marked as new." : "Request marked reviewed.");
      }
    } catch (cause) {
      notifyQuoteRequestsChanged();
      if (mountedRef.current) setActionError(cause.message);
    } finally {
      busyRef.current = false;
      if (mountedRef.current) setPending(false);
    }
  };
  const chooseCleanup = (action) => { setActionError(""); setNotice(""); setConfirmation(action); };
  const cancelCleanup = () => { if (!pending) { setConfirmation(null); setActionError(""); setRefresh((value) => value + 1); } };
  const deleting = confirmation === "request";

  return <PrototypeDialog open={Boolean(id)} onClose={close} dismissible={!pending} labelledBy={confirmation ? "quote-cleanup-heading" : "quote-request-details-heading"} className="max-w-2xl">
    <div className="p-5 sm:p-7">
      {confirmation && request ? <>
        <div className="flex items-center gap-3"><Trash2 className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" /><h2 id="quote-cleanup-heading" className="text-xl font-medium">{deleting ? "Delete quote request?" : "Remove product photos?"}</h2></div>
        <p className="mt-5 break-words text-sm leading-relaxed text-zinc-600">{deleting ? <>Permanently delete the request from <strong className="font-medium text-zinc-900">{request.full_name}</strong>{request.photos.length ? ` and all ${request.photos.length} attached ${request.photos.length === 1 ? "photo" : "photos"} from Supabase Storage` : ""}. This cannot be undone.</> : <>Permanently remove all {request.photos.length} product {request.photos.length === 1 ? "photo" : "photos"} from Supabase Storage. Customer details and product requirements will be kept. Removed photos cannot be recovered.</>}</p>
        {actionError && <p role="alert" className="mt-4 text-sm leading-relaxed text-primary">{actionError}</p>}
        <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-zinc-100 pt-5"><button ref={cancelRef} type="button" disabled={pending} onClick={cancelCleanup} className={actionClass}>Cancel</button><button type="button" disabled={pending} onClick={() => mutate(confirmation)} className={deleteClass}>{pending ? <><LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /><span role="status">Removing...</span></> : <><Trash2 className="h-4 w-4" aria-hidden="true" />{deleting ? "Delete Request" : "Remove Photos"}</>}</button></div>
      </> : <>
        <div className="flex items-start justify-between gap-4"><div className="min-w-0"><h2 id="quote-request-details-heading" className="text-xl font-medium">Quote request</h2>{request && <><p className="mt-2 break-all text-[11px] text-zinc-500">{request.id}</p><div className="mt-3"><QuoteRequestStatus request={request} showLabel /></div></>}</div><button type="button" disabled={pending} onClick={close} className={iconButtonClass + " disabled:opacity-40"} aria-label="Close request details" title="Close request details"><X className="h-5 w-5" aria-hidden="true" /></button></div>
        {loading && <div role="status" className="flex items-center gap-2 py-12 text-sm text-zinc-500"><LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />Loading request...</div>}
        {error && <div className="mt-6"><p role="alert" className="text-sm leading-relaxed text-primary">{error}</p><button type="button" onClick={() => setRefresh((value) => value + 1)} className={actionClass + " mt-4"}><RefreshCw className="h-4 w-4" aria-hidden="true" />Retry</button></div>}
        {notice && <p role="status" className="mt-5 text-sm leading-relaxed text-emerald-700">{notice}</p>}
        {request && !loading && <>
          <dl className="mt-6 grid min-w-0 gap-5 text-sm sm:grid-cols-2"><div className="min-w-0"><dt className="text-xs text-zinc-500">Full name</dt><dd className="mt-1 break-words font-medium">{request.full_name}</dd></div><div><dt className="text-xs text-zinc-500">Received</dt><dd className="mt-1 text-xs leading-relaxed"><time dateTime={request.submitted_at}>{formatQuoteReceived(request.submitted_at)}</time></dd></div><div><dt className="text-xs text-zinc-500">Phone number</dt><dd className="mt-2"><a href={quotePhoneLink(request.phone)} className="inline-flex items-center gap-2 rounded text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Phone className="h-3.5 w-3.5" aria-hidden="true" />{request.phone}</a></dd></div><div className="min-w-0"><dt className="text-xs text-zinc-500">Email</dt><dd className="mt-2">{request.email ? <a href={"mailto:" + encodeURIComponent(request.email)} className="inline-flex max-w-full items-center gap-2 rounded text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Mail className="h-3.5 w-3.5" aria-hidden="true" /><span className="break-all">{request.email}</span></a> : <span className="text-zinc-400">Not provided</span>}</dd></div><div className="min-w-0 border-t border-zinc-100 pt-5 sm:col-span-2"><dt className="text-xs text-zinc-500">Product requirements</dt><dd className="mt-3 whitespace-pre-wrap break-words leading-relaxed">{request.requirements}</dd></div></dl>
          <div className="mt-6 border-t border-zinc-100 pt-5"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-medium">Product photos <span className="ml-1 text-zinc-400">{request.photos.length}</span></h3>{request.photos.length > 0 && !request.cleanup_action && <button type="button" disabled={pending} onClick={() => setRefresh((value) => value + 1)} className={iconButtonClass} title="Refresh photo links" aria-label="Refresh photo links"><RefreshCw className="h-4 w-4" aria-hidden="true" /></button>}</div>
            {request.photos_error && <p role="alert" className="mt-3 text-xs leading-relaxed text-amber-700">{request.photos_error}</p>}
            {request.photos.length ? <ul className="mt-4 grid gap-4 sm:grid-cols-2">{request.photos.map((photo) => <li key={photo.path} className="min-w-0 rounded-md border border-zinc-200 p-3">{photo.url ? <img src={photo.url} alt={"Product reference photo: " + photo.name} width={280} height={180} className="h-40 w-full object-contain" /> : <div className="flex h-40 items-center justify-center text-zinc-400"><ImageOff className="h-6 w-6" aria-label="Photo preview unavailable during cleanup" /></div>}<div className="mt-3 flex items-start justify-between gap-2 border-t border-zinc-100 pt-3"><div className="min-w-0"><p className="break-all text-xs">{photo.name}</p><p className="mt-1 text-[11px] text-zinc-500">{formatQuoteFileSize(photo.size)}</p></div>{photo.url && <a href={photo.url} target="_blank" rel="noopener noreferrer" className={iconButtonClass} aria-label={"Open " + photo.name + " in a new tab"} title="Open product photo"><ExternalLink className="h-4 w-4" aria-hidden="true" /></a>}</div></li>)}</ul> : <p className="mt-3 text-xs text-zinc-500">{request.photos_removed_at ? "Photos removed on " + formatQuoteReceived(request.photos_removed_at) + "." : "No photos attached."}</p>}
          </div>
          {actionError && <p role="alert" className="mt-5 text-sm leading-relaxed text-primary">{actionError}</p>}
          <div className="mt-6 flex flex-wrap gap-2 border-t border-zinc-100 pt-5">
            <button type="button" disabled={pending || Boolean(request.cleanup_action)} onClick={() => mutate("review")} className={actionClass + (!request.reviewed_at ? " border-primary bg-primary-light text-primary" : "")}>{pending ? <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : request.reviewed_at ? <CircleDot className="h-4 w-4" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}{request.reviewed_at ? "Mark as New" : "Mark Reviewed"}</button>
            {(request.photos.length > 0 || request.cleanup_action === "photos") && request.cleanup_action !== "request" && <button type="button" disabled={pending || !request.reviewed_at} onClick={() => chooseCleanup("photos")} className={actionClass} title={!request.reviewed_at ? "Mark reviewed first" : "Remove stored photos; keep request details"}><ImageOff className="h-4 w-4" aria-hidden="true" />{request.cleanup_action === "photos" ? "Retry Photo Cleanup" : "Remove Photos"}</button>}
            {request.cleanup_action !== "photos" && <button type="button" disabled={pending || !request.reviewed_at} onClick={() => chooseCleanup("request")} className={actionClass + " text-primary"} title={!request.reviewed_at ? "Mark reviewed first" : "Delete request and its stored photos"}><Trash2 className="h-4 w-4" aria-hidden="true" />{request.cleanup_action === "request" ? "Retry Deletion" : "Delete Request"}</button>}
          </div>
          {!request.reviewed_at && <p className="mt-3 text-xs leading-relaxed text-zinc-500">Mark this request reviewed before removing photos or deleting it.</p>}
        </>}
      </>}
    </div>
  </PrototypeDialog>;
}
