import { useEffect, useRef, useState } from "react";
import { Building2, FileText, LoaderCircle, Mail, MapPin, Pencil, PenTool, Phone, Save, Trash2, Undo2, Upload, X } from "lucide-react";
import { businessLimits, emptyBusiness, normalizeBusiness, validateBusiness } from "../../utils/adminBusiness";
import { businessRequest, encodeBusinessFile } from "../../lib/businesses/browser";
import PrototypeDialog from "./PrototypeDialog";
import BusinessTemplatePicker from "./BusinessTemplatePicker";

const inputClass = "min-h-[44px] w-full min-w-0 rounded-md border bg-white-500 px-3 py-2.5 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-zinc-50 sm:text-sm";
const actionClass = "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryClass = actionClass + " border border-zinc-200 bg-white-500 text-zinc-700 hover:bg-zinc-50";
const primaryClass = actionClass + " bg-primary text-primary-foreground hover:bg-primary-hover";

export function BusinessAsset({ asset, slot, className = "" }) {
  return <div className={"flex h-28 items-center justify-center overflow-hidden rounded-md border border-zinc-200 bg-white-500 p-3 " + className}>{asset?.url ? <img src={asset.url} alt={"Business " + slot} width={320} height={160} className="h-full w-full object-contain" /> : <div className="flex flex-col items-center gap-2 text-xs text-zinc-400">{slot === "logo" ? <Building2 className="h-7 w-7" aria-hidden="true" /> : <PenTool className="h-7 w-7" aria-hidden="true" />}<span>{asset?.path ? "Preview unavailable" : "No image selected"}</span></div>}</div>;
}

function ImageInput({ slot, file, existing, error, disabled, onChange }) {
  const [preview, setPreview] = useState(null);
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const title = slot === "logo" ? "Logo" : "Signature";
  return <div className="min-w-0"><label htmlFor={"business-" + slot} className="mb-2 block text-sm font-medium text-zinc-700">{title} <span className="text-primary" aria-hidden="true">*</span></label><BusinessAsset slot={slot} asset={file ? { url: preview } : existing} /><div className="mt-2 flex items-center gap-2"><label className={"relative inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white-500 px-3 py-2 text-xs font-medium text-zinc-700 focus-within:ring-2 focus-within:ring-primary " + (disabled ? "pointer-events-none opacity-50" : "hover:bg-zinc-50")}><Upload className="h-4 w-4" aria-hidden="true" />{file || existing?.path ? "Replace " : "Upload "}{slot}<input id={"business-" + slot} type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" disabled={disabled} aria-required="true" aria-invalid={Boolean(error)} aria-describedby={error ? "business-" + slot + "-error" : "business-files-help"} onChange={(event) => { onChange(event.target.files?.[0] || null); event.target.value = ""; }} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" /></label>{file && <button type="button" disabled={disabled} onClick={() => onChange(null)} title={"Clear selected " + slot} aria-label={"Clear selected " + slot} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-zinc-200 text-zinc-500 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><X className="h-4 w-4" aria-hidden="true" /></button>}</div><p className="mt-1.5 min-h-[1.25rem] break-all text-xs text-zinc-500">{file?.name || existing?.name || "JPG or PNG"}</p>{error && <p id={"business-" + slot + "-error"} className="mt-1 text-xs text-primary">{error}</p>}</div>;
}

function BillingFormatAsset({ asset }) {
  return <div className="flex min-w-0 items-start gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
    <FileText className="mt-3 h-5 w-5 shrink-0 text-zinc-400" aria-hidden="true" />
    <div className="min-w-0 flex-1">
      {asset?.url ? <a href={asset.url} target="_blank" rel="noopener noreferrer" className="flex min-h-[44px] items-center break-all text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={"View billing format: " + asset.name}>{asset.name}</a> : <p className="break-all py-3 text-sm text-zinc-600">{asset?.name || "No billing format added"}</p>}
      {asset?.path && <p className="pb-2 text-xs text-zinc-500">{asset.mime_type === "application/pdf" ? "PDF" : "Image"}{Number.isFinite(asset.size) && `, ${(asset.size / 1024 / 1024).toFixed(2)} MB`}{!asset.url && ", preview unavailable"}</p>}
    </div>
  </div>;
}

function BillingFormatInput({ file, existing, removeExisting, error, disabled, onChange, onRemoveChange }) {
  const current = removeExisting ? null : existing;
  return <div className="min-w-0">
    <label htmlFor="business-billingFormat" className="mb-2 block text-sm font-medium text-zinc-700">Custom billing format <span className="text-primary" aria-hidden="true">*</span></label>
    {file ? <div className="flex min-w-0 items-start gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-3"><FileText className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" aria-hidden="true" /><p className="min-w-0 break-all text-sm text-zinc-700">{file.name}</p></div> : <BillingFormatAsset asset={current} />}
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <label className={"relative inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white-500 px-3 py-2 text-sm font-medium text-zinc-700 focus-within:ring-2 focus-within:ring-primary " + (disabled ? "pointer-events-none opacity-50" : "hover:bg-zinc-50")}>
        <Upload className="h-4 w-4" aria-hidden="true" />{file || current ? "Replace file" : "Choose file"}
        <input id="business-billingFormat" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" disabled={disabled} aria-required="true" aria-invalid={Boolean(error)} aria-describedby={error ? "business-billingFormat-error" : "business-files-help"} onChange={(event) => { const selected = event.target.files?.[0]; if (selected) onChange(selected); event.target.value = ""; }} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
      </label>
      {(file || current) && <button type="button" disabled={disabled} onClick={() => file ? onChange(null) : onRemoveChange(true)} title={file ? "Clear selected file" : "Remove billing format on save"} aria-label={file ? "Clear selected billing format" : "Remove billing format on save"} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-zinc-200 text-zinc-500 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50">{file ? <X className="h-4 w-4" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}</button>}
      {removeExisting && existing && <button type="button" disabled={disabled} onClick={() => onRemoveChange(false)} className={secondaryClass} title="Restore billing format"><Undo2 className="h-4 w-4" aria-hidden="true" />Restore</button>}
    </div>
    {removeExisting && existing && <p role="status" className="mt-2 text-xs text-zinc-500">Billing format will be removed when you save.</p>}
    {error && <p id="business-billingFormat-error" className="mt-1.5 text-xs text-primary">{error}</p>}
  </div>;
}

export default function BusinessDialog({ selection, onClose, onChanged }) {
  const [mode, setMode] = useState(selection?.mode || "view");
  const [record, setRecord] = useState(null);
  const [values, setValues] = useState(emptyBusiness);
  const [images, setImages] = useState({ logo: null, signature: null });
  const [billingFormat, setBillingFormat] = useState(null);
  const [removeBillingFormat, setRemoveBillingFormat] = useState(false);
  const [loading, setLoading] = useState(Boolean(selection?.id));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState({});
  const [conflict, setConflict] = useState(false);
  const [reload, setReload] = useState(0);
  const busy = useRef(false);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);
  useEffect(() => {
    if (!selection?.id) return;
    const controller = new AbortController(); setLoading(true); setError("");
    businessRequest("/api/admin/businesses/" + selection.id, { signal: controller.signal })
      .then((data) => { if (!controller.signal.aborted) { setRecord(data); setValues(normalizeBusiness(data)); setImages({ logo: null, signature: null }); setBillingFormat(null); setRemoveBillingFormat(false); setConflict(false); } })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [selection?.id, reload]);
  const close = () => { if (!busy.current) onClose(); };
  const changeMode = (next) => { setMode(next); setError(""); setFields({}); if (next === "edit") { setValues(normalizeBusiness(record)); setBillingFormat(null); setRemoveBillingFormat(false); } };
  const save = async (event) => {
    event.preventDefault(); if (busy.current) return;
    const errors = validateBusiness(values, images, record, billingFormat, removeBillingFormat); setFields(errors); setError("");
    if (Object.keys(errors).length) { document.getElementById("business-" + (Object.keys(errors)[0] === "images" ? "logo" : Object.keys(errors)[0]))?.focus(); return; }
    busy.current = true; setPending(true);
    try {
      const encoded = {};
      for (const slot of ["logo", "signature"]) if (images[slot]) encoded[slot] = await encodeBusinessFile(images[slot]);
      const encodedFormat = billingFormat ? await encodeBusinessFile(billingFormat) : null;
      const result = await businessRequest("/api/admin/businesses" + (record ? "/" + record.id : ""), { method: record ? "PATCH" : "POST", body: { ...normalizeBusiness(values), images: encoded, billingFormat: encodedFormat, removeBillingFormat, ...(record ? { revision: record.revision } : {}) } });
      if (mounted.current) { onChanged(result.cleanupPending ? "Business saved. Old file cleanup is queued for retry." : record ? "Business updated." : "Business created."); onClose(); }
    } catch (cause) { if (mounted.current) { setError(cause.message); setFields(cause.fields || {}); setConflict(cause.status === 409); } }
    finally { busy.current = false; if (mounted.current) setPending(false); }
  };
  const remove = async () => {
    if (busy.current || !record) return; busy.current = true; setPending(true); setError("");
    try {
      await businessRequest("/api/admin/businesses/" + record.id, { method: "DELETE", body: { revision: record.revision, confirmation: "delete-business" } });
      if (mounted.current) { onChanged("Business and its files deleted."); onClose(); }
    } catch (cause) { if (mounted.current) { setError(cause.message); setConflict(cause.status === 409); setRecord((current) => ({ ...current, deletion_pending: true })); } }
    finally { busy.current = false; if (mounted.current) setPending(false); }
  };
  const title = mode === "create" ? "Create business" : mode === "edit" ? "Edit business" : mode === "delete" ? "Delete business?" : "Business details";
  const editing = mode === "create" || mode === "edit";
  return <PrototypeDialog open={Boolean(selection)} onClose={close} labelledBy="business-dialog-heading" dismissible={!pending} className="max-h-[calc(100dvh-2rem)]">
    <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-zinc-200 bg-white-500 px-4 py-4 sm:px-6"><h2 id="business-dialog-heading" className="min-w-0 break-words text-lg font-medium">{title}</h2><button type="button" disabled={pending} onClick={close} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40" title="Close business" aria-label="Close business"><X className="h-5 w-5" aria-hidden="true" /></button></div>
    {loading ? <div role="status" className="flex min-h-[220px] items-center justify-center gap-2 text-sm text-zinc-500"><LoaderCircle className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />Loading business...</div> : <>
      {error && <div role="alert" className="mx-4 mt-4 rounded-md border border-primary/20 bg-primary-light p-3 text-sm leading-6 text-primary sm:mx-6">{error}{(!record && selection?.id || conflict) && <button type="button" disabled={pending} onClick={() => { setReload((value) => value + 1); setFields({}); }} className="mt-2 block min-h-[44px] rounded px-2 font-medium underline focus-visible:ring-2 focus-visible:ring-primary">Reload business</button>}</div>}
      {editing ? <form onSubmit={save} noValidate>
        <div className="space-y-6 px-4 py-5 sm:px-6"><div className="grid grid-cols-1 gap-5 sm:grid-cols-2">{[{ id: "name", label: "Business name", complete: "organization" }, { id: "ntn", label: "NTN number" }, { id: "email", label: "Email", type: "email", complete: "email" }, { id: "phone", label: "Phone number", type: "tel", complete: "tel" }, { id: "address", label: "Address", complete: "street-address" }].map((field) => <div key={field.id} className={field.id === "address" ? "min-w-0 sm:col-span-2" : "min-w-0"}><label htmlFor={"business-" + field.id} className="mb-2 block text-sm font-medium text-zinc-700">{field.label} <span className="text-primary" aria-hidden="true">*</span></label>{field.id === "address" ? <textarea id="business-address" name="address" rows={3} maxLength={businessLimits.address} required autoComplete={field.complete} disabled={pending} value={values.address} onChange={(event) => { setValues((current) => ({ ...current, address: event.target.value })); setFields((current) => ({ ...current, address: "" })); }} aria-invalid={Boolean(fields.address)} aria-describedby={fields.address ? "business-address-error" : undefined} className={inputClass + " resize-y " + (fields.address ? "border-primary" : "border-zinc-200")} /> : <input id={"business-" + field.id} name={field.id} type={field.type || "text"} autoComplete={field.complete || "off"} maxLength={businessLimits[field.id]} required disabled={pending} value={values[field.id]} onChange={(event) => { setValues((current) => ({ ...current, [field.id]: event.target.value })); setFields((current) => ({ ...current, [field.id]: "" })); }} aria-invalid={Boolean(fields[field.id])} aria-describedby={fields[field.id] ? "business-" + field.id + "-error" : undefined} className={inputClass + " " + (fields[field.id] ? "border-primary" : "border-zinc-200")} />}{fields[field.id] && <p id={"business-" + field.id + "-error"} className="mt-1.5 text-xs text-primary">{fields[field.id]}</p>}</div>)}</div>
          <div className="min-w-0">
            <label htmlFor="business-special_notes" className="mb-2 block text-sm font-medium text-zinc-700">Special Notes and Instructions <span className="font-normal text-zinc-400">(optional)</span></label>
            <textarea id="business-special_notes" name="special_notes" rows={5} maxLength={businessLimits.special_notes} disabled={pending} value={values.special_notes} onChange={(event) => { setValues((current) => ({ ...current, special_notes: event.target.value })); setFields((current) => ({ ...current, special_notes: "" })); }} aria-invalid={Boolean(fields.special_notes)} aria-describedby={fields.special_notes ? "business-special_notes-error" : "business-special_notes-help"} className={inputClass + " resize-y " + (fields.special_notes ? "border-primary" : "border-zinc-200")} />
            <p id="business-special_notes-help" className="mt-1.5 text-right text-xs tabular-nums text-zinc-400">{values.special_notes.length} / {businessLimits.special_notes}</p>
            {fields.special_notes && <p id="business-special_notes-error" className="mt-1.5 text-xs text-primary">{fields.special_notes}</p>}
          </div>
          <div className="grid gap-5 sm:grid-cols-2">{["logo", "signature"].map((slot) => <ImageInput key={slot} slot={slot} file={images[slot]} existing={record?.[slot]} error={fields[slot]} disabled={pending} onChange={(file) => { setImages((current) => ({ ...current, [slot]: file })); setFields((current) => ({ ...current, [slot]: "", images: "" })); }} />)}</div>
          <BusinessTemplatePicker values={values} assets={record || {}} images={images} fields={fields} disabled={pending} onChange={(choice) => {
            setValues((current) => ({ ...current, ...choice }));
            setFields((current) => ({ ...current, billing_mode: "", template_id: "", billingFormat: "", images: "" }));
            if (choice.billing_mode === "builtin") setBillingFormat(null);
          }} customUpload={<BillingFormatInput file={billingFormat} existing={record?.billing_format} removeExisting={removeBillingFormat} error={fields.billingFormat} disabled={pending} onChange={(file) => { setBillingFormat(file); setRemoveBillingFormat(false); setFields((current) => ({ ...current, billingFormat: "", images: "" })); }} onRemoveChange={(value) => { setRemoveBillingFormat(value); setFields((current) => ({ ...current, billingFormat: "", images: "" })); }} />} />
          <p id="business-files-help" className="text-xs leading-5 text-zinc-500">Logo and signature: JPG or PNG. Billing format: PDF, JPG or PNG. Up to 2 MB per file and 3 MB combined for selected uploads.</p>{fields.images && <p role="alert" className="text-xs text-primary">{fields.images}</p>}
        </div><div className="sticky bottom-0 flex flex-wrap justify-end gap-3 border-t border-zinc-200 bg-white-500 px-4 py-4 sm:px-6"><button type="button" disabled={pending} onClick={close} className={secondaryClass}>Cancel</button><button type="submit" disabled={pending || record?.deletion_pending} className={primaryClass}>{pending ? <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}{pending ? "Saving..." : "Save business"}</button></div>
      </form> : mode === "delete" && record ? <><div className="space-y-4 px-4 py-5 text-sm leading-6 sm:px-6"><p>Permanently delete <strong className="break-words">{record.name}</strong> and its logo, signature and billing format from Supabase Storage?</p><p className="text-zinc-500">This cannot be undone.</p></div><div className="flex flex-wrap justify-end gap-3 border-t border-zinc-200 px-4 py-4 sm:px-6"><button type="button" autoFocus disabled={pending} onClick={close} className={secondaryClass}>Cancel</button><button type="button" disabled={pending} onClick={remove} className={primaryClass}>{pending ? <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}{pending ? "Deleting..." : record.deletion_pending ? "Retry deletion" : "Delete business"}</button></div></> : record && <><div className="space-y-6 px-4 py-5 sm:px-6"><h3 className="break-words text-lg font-medium">{record.name}</h3>{record.deletion_pending && <p role="status" className="rounded-md bg-amber-50 p-3 text-sm leading-6 text-amber-800">Deletion needs to finish. Business editing is locked until deletion completes.</p>}<dl className="grid gap-5 text-sm sm:grid-cols-2"><div><dt className="text-xs text-zinc-500">NTN number</dt><dd className="mt-2 break-all font-medium">{record.ntn}</dd></div><div><dt className="text-xs text-zinc-500">Phone number</dt><dd className="mt-2"><a href={"tel:" + record.phone.replace(/[^+\d]/g, "")} className="inline-flex min-h-[44px] items-center gap-2 break-all text-zinc-700 hover:text-primary"><Phone className="h-4 w-4 shrink-0" aria-hidden="true" />{record.phone}</a></dd></div><div className="sm:col-span-2"><dt className="text-xs text-zinc-500">Email</dt><dd className="mt-2"><a href={"mailto:" + encodeURIComponent(record.email)} className="inline-flex min-h-[44px] max-w-full items-center gap-2 break-all text-zinc-700 hover:text-primary"><Mail className="h-4 w-4 shrink-0" aria-hidden="true" />{record.email}</a></dd></div><div className="sm:col-span-2"><dt className="text-xs text-zinc-500">Address</dt><dd className="mt-2 flex items-start gap-2 break-words leading-6"><MapPin className="mt-1 h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" /><span className="min-w-0 whitespace-pre-wrap">{record.address}</span></dd></div><div className="sm:col-span-2"><dt className="text-xs text-zinc-500">Special Notes and Instructions</dt><dd className="mt-2 whitespace-pre-wrap break-words leading-6 text-zinc-700">{record.special_notes || "Not added"}</dd></div></dl><div className="grid gap-5 sm:grid-cols-2">{["logo", "signature"].map((slot) => <div key={slot}><h3 className="mb-2 text-sm font-medium capitalize">{slot}</h3><BusinessAsset slot={slot} asset={record[slot]} /></div>)}</div><BusinessTemplatePicker values={normalizeBusiness(record)} assets={record} readOnly />{record.billing_format && <div className="min-w-0"><h3 className="mb-2 text-sm font-medium">{record.billing_mode === "custom" ? "Custom billing format" : "Saved custom format (inactive)"}</h3><BillingFormatAsset asset={record.billing_format} /></div>}</div><div className="flex flex-wrap justify-end gap-3 border-t border-zinc-200 px-4 py-4 sm:px-6"><button type="button" onClick={() => changeMode("delete")} className={secondaryClass + " text-primary"}><Trash2 className="h-4 w-4" aria-hidden="true" />{record.deletion_pending ? "Retry deletion" : "Delete"}</button><button type="button" disabled={record.deletion_pending} onClick={() => changeMode("edit")} className={primaryClass}><Pencil className="h-4 w-4" aria-hidden="true" />Edit business</button></div></>}
    </>}
  </PrototypeDialog>;
}
