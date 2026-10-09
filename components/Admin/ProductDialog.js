import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Package, Pencil, Save, Trash2, X } from "lucide-react";
import { emptyProduct, formatProductPrice, normalizeProduct, productLimits, validateProduct } from "../../utils/adminProduct";
import { productRequest } from "../../lib/products/browser";
import PrototypeDialog from "./PrototypeDialog";

const inputClass = "min-h-[44px] w-full min-w-0 rounded-md border bg-white-500 px-3 py-2.5 text-base text-zinc-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-zinc-50 sm:text-sm";
const actionClass = "inline-flex min-h-[44px] min-w-0 items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[120px] sm:px-4";
const secondaryClass = actionClass + " border border-zinc-200 bg-white-500 text-zinc-700 hover:bg-zinc-50";
const primaryClass = actionClass + " bg-primary text-primary-foreground hover:bg-primary-hover";
const footerClass = "sticky bottom-0 grid grid-cols-2 gap-3 border-t border-zinc-200 bg-white-500 px-4 py-4 sm:flex sm:justify-end sm:px-6";

export default function ProductDialog({ selection, onClose, onChanged }) {
  const [mode, setMode] = useState(selection?.mode || "view");
  const [record, setRecord] = useState(null);
  const [values, setValues] = useState(emptyProduct);
  const [loading, setLoading] = useState(Boolean(selection?.id));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState({});
  const [conflict, setConflict] = useState(false);
  const [reload, setReload] = useState(0);
  const busy = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!selection?.id) return;
    const controller = new AbortController();
    setLoading(true); setError(""); setFields({}); setConflict(false); setRecord(null);
    productRequest("/api/admin/products/" + selection.id, { signal: controller.signal })
      .then((data) => { if (!controller.signal.aborted) { setRecord(data); setValues(normalizeProduct(data)); } })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [selection?.id, reload]);

  const close = () => { if (!busy.current) onClose(); };
  const changeMode = (next) => {
    setMode(next); setError(""); setFields({}); setConflict(false);
    if (next === "edit") setValues(normalizeProduct(record));
  };
  const changeField = (key, value) => {
    setValues((current) => ({ ...current, [key]: value }));
    setFields((current) => ({ ...current, [key]: "" }));
  };
  const save = async (event) => {
    event.preventDefault();
    if (busy.current || conflict || (selection?.id && !record)) return;
    const errors = validateProduct(values); setFields(errors); setError("");
    if (Object.keys(errors).length) { document.getElementById("product-" + Object.keys(errors)[0])?.focus(); return; }
    busy.current = true; setPending(true);
    try {
      const normalized = normalizeProduct(values);
      await productRequest("/api/admin/products" + (record ? "/" + record.id : ""), {
        method: record ? "PATCH" : "POST",
        body: { name: normalized.name, price: Number(normalized.price), ...(record ? { revision: record.revision } : {}) },
      });
      if (mounted.current) { onChanged(record ? "Product updated." : "Product created."); onClose(); }
    } catch (cause) {
      if (mounted.current) { setError(cause.message); setFields(cause.fields || {}); setConflict(cause.status === 409); }
    } finally { busy.current = false; if (mounted.current) setPending(false); }
  };
  const remove = async () => {
    if (busy.current || conflict || !record) return;
    busy.current = true; setPending(true); setError("");
    try {
      await productRequest("/api/admin/products/" + record.id, { method: "DELETE", body: { revision: record.revision, confirmation: "delete-product" } });
      if (mounted.current) { onChanged("Product deleted."); onClose(); }
    } catch (cause) {
      if (mounted.current) { setError(cause.message); setConflict(cause.status === 409); }
    } finally { busy.current = false; if (mounted.current) setPending(false); }
  };
  const title = mode === "create" ? "Create product" : mode === "edit" ? "Edit product" : mode === "delete" ? "Delete product?" : "Product details";
  const ready = !selection?.id || Boolean(record);
  const editing = mode === "create" || mode === "edit";

  return <PrototypeDialog open={Boolean(selection)} onClose={close} labelledBy="product-dialog-heading" dismissible={!pending}>
    <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-zinc-200 bg-white-500 px-4 py-4 sm:px-6">
      <h2 id="product-dialog-heading" className="min-w-0 break-words text-lg font-medium">{title}</h2>
      <button type="button" disabled={pending} onClick={close} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40" title="Close product" aria-label="Close product"><X className="h-5 w-5" aria-hidden="true" /></button>
    </div>
    {loading ? <div role="status" className="flex min-h-[220px] items-center justify-center gap-2 text-sm text-zinc-500"><LoaderCircle className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />Loading product...</div> : <>
      {error && <div role="alert" className="mx-4 mt-4 rounded-md border border-primary/20 bg-primary-light p-3 text-sm leading-6 text-primary sm:mx-6">
        {error}
        {((!record && selection?.id) || conflict) && <button type="button" disabled={pending} onClick={() => setReload((value) => value + 1)} className="mt-2 block min-h-[44px] rounded px-2 font-medium underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Reload product</button>}
      </div>}
      {!ready ? <div className="px-4 py-5 sm:px-6"><button type="button" onClick={close} className={secondaryClass}>Close</button></div> : editing ? <form onSubmit={save} noValidate aria-busy={pending}>
        <div className="grid grid-cols-1 gap-5 px-4 py-5 sm:grid-cols-3 sm:px-6">
          <div className="min-w-0 sm:col-span-2">
            <label htmlFor="product-name" className="mb-2 block text-sm font-medium text-zinc-700">Name <span className="text-primary" aria-hidden="true">*</span></label>
            <input id="product-name" name="name" type="text" autoComplete="off" autoFocus={mode === "create"} maxLength={productLimits.name} required disabled={pending} value={values.name} onChange={(event) => changeField("name", event.target.value)} aria-invalid={Boolean(fields.name)} aria-describedby={fields.name ? "product-name-error" : undefined} className={inputClass + " " + (fields.name ? "border-primary" : "border-zinc-200")} />
            {fields.name && <p id="product-name-error" className="mt-1.5 text-xs text-primary">{fields.name}</p>}
          </div>
          <div className="min-w-0">
            <label htmlFor="product-price" className="mb-2 block text-sm font-medium text-zinc-700">Price (PKR) <span className="text-primary" aria-hidden="true">*</span></label>
            <input id="product-price" name="price" type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" maxLength={productLimits.price} required disabled={pending} value={values.price} onChange={(event) => changeField("price", event.target.value)} aria-invalid={Boolean(fields.price)} aria-describedby={fields.price ? "product-price-error" : undefined} className={inputClass + " tabular-nums " + (fields.price ? "border-primary" : "border-zinc-200")} />
            {fields.price && <p id="product-price-error" className="mt-1.5 text-xs text-primary">{fields.price}</p>}
          </div>
        </div>
        <div className={footerClass}>
          <button type="button" disabled={pending} onClick={close} className={secondaryClass}>Cancel</button>
          <button type="submit" disabled={pending || conflict} aria-label={pending ? "Saving product" : "Save product"} className={primaryClass}>{pending ? <LoaderCircle className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Save className="h-4 w-4 shrink-0" aria-hidden="true" />}{pending ? "Saving..." : "Save"}</button>
        </div>
      </form> : mode === "delete" && record ? <>
        <div className="space-y-4 px-4 py-5 text-sm leading-6 sm:px-6"><p className="text-zinc-700">Permanently delete <strong className="break-words">{record.name}</strong>?</p><p className="text-zinc-500">This cannot be undone.</p></div>
        <div className={footerClass}><button type="button" autoFocus disabled={pending} onClick={close} className={secondaryClass}>Cancel</button><button type="button" disabled={pending || conflict} onClick={remove} aria-label="Confirm product deletion" className={primaryClass}>{pending ? <LoaderCircle className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Trash2 className="h-4 w-4 shrink-0" aria-hidden="true" />}{pending ? "Deleting..." : "Delete"}</button></div>
      </> : record && <>
        <div className="space-y-6 px-4 py-5 sm:px-6">
          <div className="flex min-w-0 items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary-light text-primary"><Package className="h-5 w-5" aria-hidden="true" /></span><h3 className="min-w-0 break-words text-lg font-medium leading-7">{record.name}</h3></div>
          <dl><dt className="text-xs text-zinc-500">Price</dt><dd className="mt-2 break-words text-xl font-medium tabular-nums text-zinc-900">{formatProductPrice(record.price)}</dd></dl>
        </div>
        <div className={footerClass}><button type="button" onClick={() => changeMode("delete")} className={secondaryClass + " text-primary"}><Trash2 className="h-4 w-4 shrink-0" aria-hidden="true" />Delete</button><button type="button" onClick={() => changeMode("edit")} className={primaryClass}><Pencil className="h-4 w-4 shrink-0" aria-hidden="true" />Edit</button></div>
      </>}
    </>}
  </PrototypeDialog>;
}
