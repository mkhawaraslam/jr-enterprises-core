import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, Download, LoaderCircle, Printer, Share2 } from "lucide-react";
import { formatQuotationAmount, formatQuotationDate } from "../../utils/adminQuotation";

const PdfViewer = dynamic(() => import("./QuotationPdfViewer"), { ssr: false });
const tools = "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white-500 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40";
const primaryTools = "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-primary bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40";

export default function QuotationShow({ quote }) {
  const [file, setFile] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const [notice, setNotice] = useState(""); const [sharing, setSharing] = useState(false); const [retry, setRetry] = useState(0);
  const url = useRef(null); const frame = useRef(null); const sharingBusy = useRef(false);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(""); setFile(null);
    (async () => {
      const response = await fetch(`/api/admin/quotations/${quote.id}/pdf`, { signal: controller.signal, credentials: "same-origin", cache: "no-store" });
      if (response.status === 401) { window.location.replace("/admin/login"); return; }
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "The PDF could not be generated.");
      if (!response.headers.get("Content-Type")?.includes("application/pdf")) throw new Error("The response was not a PDF file.");
      const blob = await response.blob();
      if (controller.signal.aborted) return;
      const document = new File([blob], quote.reference + ".pdf", { type: "application/pdf" });
      url.current = URL.createObjectURL(document); setFile(document);
    })().catch((cause) => { if (!controller.signal.aborted) setError(cause.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); if (url.current) { URL.revokeObjectURL(url.current); url.current = null; } frame.current?.remove(); };
  }, [quote.id, quote.reference, retry]);
  const download = () => { const anchor = document.createElement("a"); anchor.href = url.current; anchor.download = file.name; document.body.appendChild(anchor); anchor.click(); anchor.remove(); };
  const share = async () => {
    if (!file || sharingBusy.current) return;
    sharingBusy.current = true; setSharing(true); setNotice("");
    try {
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], title: quote.reference, text: `Quotation ${quote.reference} from ${quote.business_snapshot.name}` });
        setNotice("The PDF was shared with the selected app.");
      } else {
        download();
        let phone = quote.customer_snapshot.phone.replace(/\D/g, "");
        if (/^0\d{10}$/.test(phone)) phone = "92" + phone.slice(1);
        const recipient = /^[1-9]\d{7,14}$/.test(phone) ? phone : "";
        const message = `Hello ${quote.customer_snapshot.name}, please find quotation ${quote.reference} from ${quote.business_snapshot.name}.`;
        window.open("https://wa.me/" + recipient + "?text=" + encodeURIComponent(message), "_blank", "noopener,noreferrer");
        setNotice("PDF downloaded. Attach it in the WhatsApp chat. This browser cannot attach PDF files automatically.");
      }
    } catch (cause) { if (cause.name !== "AbortError") setNotice("Sharing is unavailable. Download the PDF and attach it in WhatsApp."); }
    finally { sharingBusy.current = false; setSharing(false); }
  };
  const print = () => {
    frame.current?.remove(); const iframe = document.createElement("iframe");
    iframe.title = "Quotation print document"; iframe.className = "fixed bottom-0 right-0 h-px w-px border-0 opacity-0";
    iframe.src = url.current; iframe.onload = () => {
      try { iframe.contentWindow.focus(); iframe.contentWindow.print(); }
      catch { window.open(url.current, "_blank", "noopener,noreferrer"); setNotice("The PDF has opened in a separate tab for printing."); }
    };
    document.body.appendChild(iframe); frame.current = iframe;
  };
  return <div className="min-w-0 space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><Link href={"/admin/quotations?business=" + quote.business_id}><a className="inline-flex min-h-[44px] items-center gap-2 rounded text-sm text-zinc-500 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Quotations</a></Link><div className="flex flex-wrap items-center gap-2"><button type="button" disabled={!file} onClick={download} className={tools} title="Download PDF" aria-label="Download PDF"><Download className="h-4 w-4" aria-hidden="true" /><span className="hidden sm:inline">Download</span></button><button type="button" disabled={!file || sharing} onClick={share} className={primaryTools} title="Share PDF via WhatsApp" aria-label="Share PDF via WhatsApp">{sharing ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Share2 className="h-4 w-4" aria-hidden="true" />}<span>Share PDF</span></button><button type="button" disabled={!file} onClick={print} className={tools} title="Print quotation" aria-label="Print quotation"><Printer className="h-4 w-4" aria-hidden="true" /><span className="hidden sm:inline">Print</span></button></div></div>
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-4 border-y border-zinc-200 bg-white-500 px-4 py-4"><div className="min-w-0"><p className="break-words text-sm font-medium text-zinc-900">{quote.business_snapshot.name}</p><p className="mt-1 break-words text-xs text-zinc-500">{quote.customer_snapshot.company_name}</p></div><div className="min-w-0"><span className="block text-xs text-zinc-500">Total</span><strong className="mt-1 block break-all text-lg font-medium tabular-nums">{formatQuotationAmount(quote.total)}</strong></div></div>
    {notice && <p role="status" className="rounded-md border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-800">{notice}</p>}
    {loading ? <div role="status" className="flex min-h-[280px] items-center justify-center gap-2 text-sm text-zinc-500"><LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />Preparing quotation PDF...</div> : error ? <div role="alert" className="border-y border-zinc-200 bg-white-500 p-5"><p className="text-sm leading-6 text-primary">{error}</p><button type="button" onClick={() => setRetry((value) => value + 1)} className={tools + " mt-3"}>Retry PDF</button></div> : file && <PdfViewer file={file} reference={quote.reference} />}
    <details className="border-y border-zinc-200 bg-white-500 px-4 py-3 sm:px-6"><summary className="min-h-[44px] cursor-pointer rounded py-3 text-sm font-medium focus-visible:ring-2 focus-visible:ring-primary">Quotation details</summary><div className="space-y-5 py-4"><dl className="grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-xs text-zinc-500">Customer</dt><dd className="mt-1 whitespace-pre-wrap break-words leading-6">{quote.customer_snapshot.name}<br />{quote.customer_snapshot.company_name}<br />{quote.customer_snapshot.address}<br /><span className="break-all">{quote.customer_snapshot.email}</span><br />{quote.customer_snapshot.phone}</dd></div><div><dt className="text-xs text-zinc-500">Date / valid until</dt><dd className="mt-1 leading-6">{formatQuotationDate(quote.date)} / {formatQuotationDate(quote.valid_until)}</dd></div>{quote.subject && <div className="sm:col-span-2"><dt className="text-xs text-zinc-500">Project / requirement</dt><dd className="mt-1 whitespace-pre-wrap break-words leading-6">{quote.subject}</dd></div>}</dl><ol className="divide-y divide-zinc-200">{quote.items.map((item) => <li key={item.position} className="py-4"><p className="whitespace-pre-wrap break-words text-sm font-medium text-zinc-900">{item.description}</p><p className="mt-2 flex flex-wrap justify-between gap-3 text-sm text-zinc-500"><span>{item.quantity} x {formatQuotationAmount(item.price)}</span><strong className="break-all font-medium tabular-nums text-zinc-900">{formatQuotationAmount(item.amount)}</strong></p></li>)}</ol>{[quote.business_snapshot.special_notes, quote.notes].filter(Boolean).map((notes, index) => <p key={index} className="whitespace-pre-wrap break-words text-sm leading-6 text-zinc-500">{notes}</p>)}</div></details>
  </div>;
}
