import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, CheckCircle2, ChevronDown, FileText, LoaderCircle, SlidersHorizontal } from "lucide-react";
import { businessRequest } from "../../lib/businesses/browser";
import { validateBusinessLayout } from "../../utils/businessLayout";
import QuotationPdfViewer from "./QuotationPdfViewer";

const input = "min-h-[44px] w-full min-w-0 rounded-md border border-zinc-200 bg-white-500 px-3 py-2 text-base text-zinc-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:text-sm";
const tabs = [{ id: "quotation", name: "Quotation" }, { id: "invoice", name: "Invoice" }, { id: "challan", name: "Delivery challan" }];
const settings = [
  { key: "header", label: "Letterhead", choices: [["split", "Logo left, contacts right"], ["centered", "Centered letterhead"], ["compact", "Title beside logo"]] },
  { key: "titleAlign", label: "Document title", choices: [["left", "Left"], ["center", "Center"], ["right", "Right"]] },
  { key: "recipientSide", label: "Customer details", choices: [["left", "Left column"], ["right", "Right column"]] },
  { key: "tableHeader", label: "Table heading", choices: [["filled", "Logo color fill"], ["line", "White with accent line"]] },
  { key: "tableBorders", label: "Table borders", choices: [["horizontal", "Horizontal rules"], ["grid", "Full grid"]] },
  { key: "rows", label: "Item rows", choices: [["plain", "White"], ["striped", "Alternating gray"]] },
  { key: "density", label: "Row spacing", choices: [["compact", "Compact"], ["normal", "Standard"], ["spacious", "Spacious"]] },
  { key: "notes", label: "Notes placement", choices: [["columns", "Beside heading"], ["stacked", "Below heading"]] },
  { key: "signatureSide", label: "Authorized signature", choices: [["left", "Left"], ["right", "Right"]] },
];
const dimensions = [{ key: "titleSize", label: "Title size", min: 18, max: 32 }, { key: "fontSize", label: "Text size", min: 9, max: 12 }, { key: "logoWidth", label: "Logo width", min: 70, max: 170 }, { key: "margin", label: "Page margins", min: 28, max: 56 }];
function tabKey(event, ids, selected, change, prefix) {
  const index = ids.indexOf(selected);
  const next = event.key === "ArrowRight" ? ids[(index + 1) % ids.length] : event.key === "ArrowLeft" ? ids[(index + ids.length - 1) % ids.length] : event.key === "Home" ? ids[0] : event.key === "End" ? ids[ids.length - 1] : null;
  if (next) { event.preventDefault(); change(next); document.getElementById(prefix + next)?.focus(); }
}

async function layoutFile(url, body, signal) {
  const response = await fetch(url, { credentials: "same-origin", cache: "no-store", signal,
    ...(body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) });
  if (response.status === 401) { window.location.replace("/admin/login"); throw new Error("Please sign in again."); }
  if (!response.ok) { const result = await response.json().catch(() => ({})); throw new Error(result.error || "The document preview could not be loaded."); }
  return response.blob();
}

export default function BusinessLayoutEditor({ businessId }) {
  const endpoint = "/api/admin/businesses/" + businessId + "/document-layout";
  const [data, setData] = useState(null); const [definition, setDefinition] = useState(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const [kind, setKind] = useState("quotation"); const [surface, setSurface] = useState("preview");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reference, setReference] = useState(null); const [referenceError, setReferenceError] = useState("");
  const [preview, setPreview] = useState(null); const [previewError, setPreviewError] = useState(""); const [previewing, setPreviewing] = useState(false);
  const [reviewed, setReviewed] = useState({}); const [confirmed, setConfirmed] = useState(false); const [pending, setPending] = useState(false);
  const [reload, setReload] = useState(0); const busy = useRef(false); const request = useRef(null); const mounted = useRef(true);
  const fingerprint = definition && data ? JSON.stringify({ definition, revision: data.business.revision }) : "";
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError("");
    businessRequest(endpoint, { signal: controller.signal }).then((result) => {
      if (!controller.signal.aborted) { setData(result); setDefinition(result.definition); setReviewed({}); setConfirmed(false); }
    }).catch((cause) => { if (!controller.signal.aborted) setError(cause.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [endpoint, reload]);
  useEffect(() => {
    if (!data) return;
    const controller = new AbortController(); setReference(null); setReferenceError("");
    layoutFile(endpoint + "/reference", null, controller.signal).then((file) => { if (!controller.signal.aborted) setReference(file); })
      .catch((cause) => { if (!controller.signal.aborted) setReferenceError(cause.message); });
    return () => controller.abort();
  }, [endpoint, data?.business.revision]);
  useEffect(() => {
    if (!data || !validateBusinessLayout(definition) || loading) return;
    const controller = new AbortController(); setPreview(null); setPreviewError(""); setPreviewing(true);
    const timer = setTimeout(() => {
      layoutFile(endpoint + "/preview", { definition, kind, revision: data.business.revision }, controller.signal)
        .then((file) => { if (!controller.signal.aborted) { setPreview(file); setReviewed((current) => ({ ...current, [kind]: fingerprint })); } })
        .catch((cause) => { if (!controller.signal.aborted) setPreviewError(cause.message); })
        .finally(() => { if (!controller.signal.aborted) setPreviewing(false); });
    }, 500);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [endpoint, fingerprint, kind, loading]);
  useEffect(() => {
    const warn = (event) => { if (data && JSON.stringify(definition) !== JSON.stringify(data.definition) && !busy.current) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [data, definition]);
  const change = (key, value) => { setDefinition((current) => ({ ...current, [key]: value })); setConfirmed(false); setNotice(""); };
  const referenceMapped = definition?.schema === 2;
  const visibleSettings = referenceMapped ? settings.filter((setting) => setting.key === "density") : settings;
  const visibleDimensions = referenceMapped ? dimensions.map((setting) => ({ ...setting,
    ...({ titleSize: { max: 24 }, margin: { min: 26, max: 40 }, logoWidth: { max: 110 } }[setting.key] || {}) })) : dimensions;
  const approvalRequired = data?.approval_required ?? !data?.current;
  const reviewedCount = tabs.filter((tab) => reviewed[tab.id] === fingerprint).length;
  const approve = async (event) => {
    event.preventDefault(); if (busy.current || !confirmed || reviewedCount !== 3 || !validateBusinessLayout(definition)) return;
    busy.current = true; setPending(true); setError("");
    const payload = { definition, revision: data.business.revision, format_hash: data.format_hash, confirmation: "approve-layout" };
    const key = JSON.stringify(payload);
    if (request.current?.key !== key) request.current = { key, id: window.crypto.randomUUID() };
    try {
      const saved = await businessRequest(endpoint, { method: "POST", body: { ...payload, request_id: request.current.id } });
      if (mounted.current) { setNotice("Version " + saved.version + " approved for future quotations, invoices and delivery challans."); setReload((value) => value + 1); }
    } catch (cause) { if (mounted.current) setError(cause.message); }
    finally { busy.current = false; if (mounted.current) setPending(false); }
  };
  return <section className="min-w-0 space-y-5" aria-label="Custom document layout">
    <Link href="/admin/businesses"><a className="inline-flex min-h-[44px] items-center gap-2 rounded text-sm text-zinc-500 focus-visible:ring-2 focus-visible:ring-primary"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Businesses</a></Link>
    {notice && <p role="status" className="border-y border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">{notice}</p>}
    {error && <p role="alert" className="border-y border-primary/20 bg-primary-light p-4 text-sm leading-6 text-primary">{error}</p>}
    {loading ? <p role="status" className="flex min-h-[220px] items-center justify-center gap-2 text-sm text-zinc-500"><LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />Loading layout...</p> : data && definition && <>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200 pb-4"><div className="min-w-0"><h2 className="break-words text-lg font-medium">{data.business.name}</h2><p className="mt-1 break-all text-xs leading-5 text-zinc-500">{data.business.billing_format.name}</p>{data.reference_mapping && <p className="mt-1 text-xs text-zinc-600">{data.reference_mapping}</p>}</div><span className={"inline-flex items-center gap-2 py-2 text-xs font-medium " + (!approvalRequired ? "text-emerald-700" : "text-amber-700")}><CheckCircle2 className="h-4 w-4" aria-hidden="true" />{!approvalRequired ? "Approved / v" + data.current.version : "Reference awaiting approval"}</span></header>
      {!referenceMapped && <p role="status" className="border-y border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">No exact reference mapping is available for this file. This preview uses the configurable layout, not an automatic recreation of the upload.</p>}
      <div className="grid min-w-0 gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <form id="business-layout-form" onSubmit={approve} className="min-w-0 space-y-5">
          <button type="button" aria-expanded={settingsOpen} aria-controls="layout-settings" onClick={() => setSettingsOpen((value) => !value)} className="flex min-h-[48px] w-full items-center gap-2 rounded-md border border-zinc-200 bg-white-500 px-4 text-left text-sm font-medium focus-visible:ring-2 focus-visible:ring-primary xl:hidden"><SlidersHorizontal className="h-4 w-4 text-zinc-400" aria-hidden="true" /><span className="flex-1">Layout settings</span><ChevronDown className={"h-4 w-4 text-zinc-400 " + (settingsOpen ? "rotate-180" : "")} aria-hidden="true" /></button>
          <fieldset id="layout-settings" disabled={pending} className={"min-w-0 space-y-4 border-y border-zinc-200 bg-white-500 p-4 " + (settingsOpen ? "block" : "hidden xl:block")}><legend className="sr-only">Layout settings</legend><h3 className="hidden items-center gap-2 text-sm font-medium xl:flex"><SlidersHorizontal className="h-4 w-4 text-zinc-400" aria-hidden="true" />Layout settings</h3>
            <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-1">{visibleSettings.map((setting) => <div key={setting.key} className="min-w-0"><label className="mb-1.5 block text-xs text-zinc-600" htmlFor={"layout-" + setting.key}>{setting.label}</label><select id={"layout-" + setting.key} value={definition[setting.key]} onChange={(event) => change(setting.key, event.target.value)} className={input}>{setting.choices.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>)}</div>
            <div className="grid min-w-0 grid-cols-2 gap-4">{visibleDimensions.map((setting) => <div key={setting.key} className="min-w-0"><label htmlFor={"layout-" + setting.key} className="mb-1.5 flex flex-wrap justify-between gap-1 text-xs text-zinc-600"><span>{setting.label}</span><output className="tabular-nums">{definition[setting.key]} pt</output></label><input id={"layout-" + setting.key} type="range" min={setting.min} max={setting.max} step={1} value={definition[setting.key]} onChange={(event) => change(setting.key, Number(event.target.value))} className="h-11 w-full min-w-0 accent-primary focus-visible:ring-2 focus-visible:ring-primary" /></div>)}</div>
            <div><label htmlFor="layout-footer" className="mb-1.5 block text-xs text-zinc-600">Footer text</label><textarea id="layout-footer" maxLength={180} rows={3} value={definition.footer} onChange={(event) => change("footer", event.target.value)} className={input + " resize-y"} /></div>
            <label className="flex min-h-[44px] cursor-pointer items-center gap-3 text-sm text-zinc-700"><input type="checkbox" checked={definition.pageNumbers} onChange={(event) => change("pageNumbers", event.target.checked)} className="h-4 w-4 accent-primary" />Page numbers</label>
          </fieldset>
          {data.history.length > 0 && <details className="border-b border-zinc-200 pb-3 text-sm"><summary className="min-h-[44px] cursor-pointer py-3 font-medium text-zinc-600">Approved versions</summary><ol className="space-y-3 pb-3">{data.history.map((version) => <li key={version.id} className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500"><span>Version {version.version}{version.id === data.current?.id ? " / current" : ""}</span><time dateTime={version.created_at}>{new Date(version.created_at).toLocaleDateString("en-GB", { timeZone: "Asia/Karachi" })}</time></li>)}</ol></details>}
        </form>
        <div className="min-w-0 space-y-4">
          <div className="flex gap-1 border-b border-zinc-200" role="tablist" aria-label="Layout comparison">{[["preview", "Document preview"], ["reference", "Uploaded reference"]].map(([id, label]) => <button key={id} type="button" role="tab" id={"layout-tab-" + id} aria-controls={"layout-panel-" + id} aria-selected={surface === id} tabIndex={surface === id ? 0 : -1} onKeyDown={(event) => tabKey(event, ["preview", "reference"], surface, setSurface, "layout-tab-")} onClick={() => setSurface(id)} className={"min-h-[44px] flex-1 border-b-2 px-2 py-2 text-sm focus-visible:ring-2 focus-visible:ring-primary " + (surface === id ? "border-primary font-medium text-primary" : "border-transparent text-zinc-500")}>{label}</button>)}</div>
          <div id="layout-panel-preview" role="tabpanel" aria-labelledby="layout-tab-preview" hidden={surface !== "preview"} className="min-w-0 space-y-4">
            <div className="grid grid-cols-3 gap-1" role="tablist" aria-label="Document type">{tabs.map((tab) => <button key={tab.id} type="button" role="tab" id={"document-tab-" + tab.id} aria-controls="document-preview-file" aria-selected={kind === tab.id} tabIndex={kind === tab.id ? 0 : -1} onKeyDown={(event) => tabKey(event, tabs.map((entry) => entry.id), kind, setKind, "document-tab-")} onClick={() => setKind(tab.id)} className={"flex min-h-[48px] min-w-0 items-center justify-center gap-1 rounded-md border px-1 py-2 text-xs leading-5 focus-visible:ring-2 focus-visible:ring-primary sm:text-sm " + (kind === tab.id ? "border-primary bg-primary-light font-medium text-primary" : "border-zinc-200 bg-white-500 text-zinc-600")}><span className="break-words">{tab.name}</span>{reviewed[tab.id] === fingerprint && <Check className="h-3.5 w-3.5 shrink-0" aria-label="Preview prepared" />}</button>)}</div>
            <p className="text-xs text-zinc-500">Demo data / not issued <span className="float-right tabular-nums">{reviewedCount} / 3 previews prepared</span></p>
            {previewError && <p role="alert" className="border-y border-primary/20 bg-primary-light p-4 text-sm leading-6 text-primary">{previewError}</p>}
            <div id="document-preview-file" role="tabpanel" aria-labelledby={"document-tab-" + kind}>{previewing ? <p role="status" className="flex min-h-[250px] items-center justify-center gap-2 border-y border-zinc-200 text-sm text-zinc-500"><LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />Preparing document...</p> : preview && <QuotationPdfViewer file={preview} reference="Layout preview - not issued" documentLabel={tabs.find((tab) => tab.id === kind).name} />}</div>
          </div>
          <div id="layout-panel-reference" role="tabpanel" aria-labelledby="layout-tab-reference" hidden={surface !== "reference"} className="min-w-0">{referenceError ? <p role="alert" className="p-4 text-sm text-primary">{referenceError}</p> : reference ? reference.type === "application/pdf" ? <QuotationPdfViewer file={reference} reference={data.business.billing_format.name} documentLabel="Uploaded reference" /> : <ReferenceImage file={reference} name={data.business.name} /> : <p role="status" className="flex min-h-[250px] items-center justify-center text-sm text-zinc-500">Loading reference...</p>}</div>
        </div>
      </div>
      <footer className="space-y-3 border-t border-zinc-200 bg-white-500 p-4 sm:px-6"><label className="flex min-h-[44px] items-start gap-3 text-sm leading-6 text-zinc-700"><input type="checkbox" checked={confirmed} disabled={pending || reviewedCount !== 3} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1.5 h-4 w-4 shrink-0 accent-primary" /><span>I approve these three previews for future documents. Previously saved documents stay unchanged.</span></label><div className="flex flex-wrap items-center justify-between gap-3"><span className="inline-flex items-center gap-2 text-xs text-zinc-500"><FileText className="h-4 w-4" aria-hidden="true" />{referenceMapped ? "Letter" : "A4"} / logo-matched colors</span><button form="business-layout-form" type="submit" disabled={pending || !confirmed || reviewedCount !== 3 || !validateBusinessLayout(definition)} className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 sm:w-auto">{pending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}{pending ? "Approving..." : "Approve for future documents"}</button></div></footer>
    </>}
  </section>;
}

function ReferenceImage({ file, name }) {
  const [url, setUrl] = useState(null);
  useEffect(() => { const next = URL.createObjectURL(file); setUrl(next); return () => URL.revokeObjectURL(next); }, [file]);
  return url ? <img src={url} alt={name + " uploaded billing-format reference"} width={794} height={1123} className="h-auto w-full border border-zinc-200 bg-white-500 object-contain" /> : null;
}
