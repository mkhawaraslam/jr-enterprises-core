import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";

const tools = "flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40";

export default function QuotationPdfViewer({ file, reference }) {
  const container = useRef(null); const canvas = useRef(null);
  const [pdf, setPdf] = useState(null); const [page, setPage] = useState(1); const [width, setWidth] = useState(300);
  const [zoom, setZoom] = useState("fit"); const [rendering, setRendering] = useState(true); const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false; let task; let document;
    setPdf(null); setError(""); setPage(1); setRendering(true);
    (async () => {
      const library = await import(/* webpackIgnore: true */ "/vendor/pdfjs/pdf.mjs");
      library.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/pdf.worker.mjs";
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (cancelled) return;
      task = library.getDocument({ data: bytes, isEvalSupported: false, useSystemFonts: false });
      document = await task.promise;
      if (!cancelled) setPdf(document); else document.destroy();
    })().catch(() => { if (!cancelled) { setError("The PDF preview could not be loaded. You can still download the document."); setRendering(false); } });
    return () => { cancelled = true; if (document) document.destroy(); else task?.destroy(); };
  }, [file]);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    if (container.current) observer.observe(container.current); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!pdf) return;
    let cancelled = false; let renderingTask; setRendering(true); setError("");
    (async () => {
      const sheet = await pdf.getPage(page);
      if (cancelled || !canvas.current) return;
      const natural = sheet.getViewport({ scale: 1 });
      const visibleWidth = zoom === "fit" ? width : zoom === "100" ? 794 : zoom === "125" ? 992 : 1191;
      const ratio = Math.min(window.devicePixelRatio || 1, 2); const viewport = sheet.getViewport({ scale: visibleWidth / natural.width * ratio });
      const surface = canvas.current; surface.width = Math.ceil(viewport.width); surface.height = Math.ceil(viewport.height);
      renderingTask = sheet.render({ canvasContext: surface.getContext("2d"), viewport }); await renderingTask.promise;
      if (!cancelled) setRendering(false);
    })().catch((cause) => { if (!cancelled && cause.name !== "RenderingCancelledException") { setError("This PDF page could not be displayed."); setRendering(false); } });
    return () => { cancelled = true; renderingTask?.cancel(); };
  }, [pdf, page, width, zoom]);
  const canvasWidth = zoom === "fit" ? "w-full" : zoom === "100" ? "w-[794px]" : zoom === "125" ? "w-[992px]" : "w-[1191px]";
  return <section aria-label="Quotation PDF preview" className="min-w-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-white-500 px-3 py-2"><div className="flex items-center gap-1"><button type="button" disabled={!pdf || page <= 1 || rendering} onClick={() => setPage((value) => value - 1)} className={tools} title="Previous PDF page" aria-label="Previous PDF page"><ChevronLeft className="h-4 w-4" aria-hidden="true" /></button><span className="px-1 text-xs tabular-nums text-zinc-500">{pdf ? `${page} / ${pdf.numPages}` : "- / -"}</span><button type="button" disabled={!pdf || page >= pdf.numPages || rendering} onClick={() => setPage((value) => value + 1)} className={tools} title="Next PDF page" aria-label="Next PDF page"><ChevronRight className="h-4 w-4" aria-hidden="true" /></button></div><select aria-label="PDF zoom" value={zoom} onChange={(event) => setZoom(event.target.value)} className="h-11 rounded-md border border-zinc-200 bg-white-500 px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"><option value="fit">Fit width</option><option value="100">100%</option><option value="125">125%</option><option value="150">150%</option></select></div>
    {error && <p role="alert" className="border-b border-zinc-200 bg-white-500 p-4 text-sm leading-6 text-primary">{error}</p>}
    <div className="overflow-x-auto p-3 sm:p-5"><div ref={container} className="relative mx-auto min-h-[200px] w-full max-w-[794px]">{rendering && <div role="status" className="absolute inset-x-0 top-8 z-10 flex justify-center"><span className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white-500 px-4 py-3 text-sm text-zinc-500"><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />Preparing preview...</span></div>}<canvas ref={canvas} role="img" aria-label={`${reference}, page ${page}`} className={"block h-auto bg-white-500 shadow-sm " + canvasWidth + (rendering ? " invisible" : "")} /></div></div>
  </section>;
}
