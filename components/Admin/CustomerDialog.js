import { useEffect, useRef, useState } from "react";
import { Building2, LoaderCircle, Mail, MapPin, Pencil, Phone, Save, Trash2, UserRound, X } from "lucide-react";
import { customerLimits, customerRequiredFields, emptyCustomer, normalizeCustomer, validateCustomer } from "../../utils/adminCustomer";
import { customerRequest } from "../../lib/customers/browser";
import PrototypeDialog from "./PrototypeDialog";

const inputClass = "min-h-[44px] w-full min-w-0 rounded-md border bg-white-500 px-3 py-2.5 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-zinc-50 sm:text-sm";
const actionClass = "inline-flex min-h-[44px] min-w-0 items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[120px] sm:px-4";
const secondaryClass = actionClass + " border border-zinc-200 bg-white-500 text-zinc-700 hover:bg-zinc-50";
const primaryClass = actionClass + " bg-primary text-primary-foreground hover:bg-primary-hover";
const footerClass = "sticky bottom-0 grid grid-cols-2 gap-3 border-t border-zinc-200 bg-white-500 px-4 py-4 sm:flex sm:justify-end sm:px-6";
const customerFields = [
  { id: "name", label: "Name", complete: "name" },
  { id: "company_name", label: "Company name", complete: "organization" },
  { id: "email", label: "Email", type: "email", complete: "email" },
  { id: "phone", label: "Phone number", type: "tel", complete: "tel" },
  { id: "address", label: "Address", complete: "street-address" },
];

export default function CustomerDialog({ selection, onClose, onChanged }) {
  const [mode, setMode] = useState(selection?.mode || "view");
  const [record, setRecord] = useState(null);
  const [values, setValues] = useState(emptyCustomer);
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
    customerRequest("/api/admin/customers/" + selection.id, { signal: controller.signal })
      .then((data) => { if (!controller.signal.aborted) { setRecord(data); setValues(normalizeCustomer(data)); } })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [selection?.id, reload]);

  const close = () => { if (!busy.current) onClose(); };
  const changeMode = (next) => {
    setMode(next); setError(""); setFields({}); setConflict(false);
    if (next === "edit") setValues(normalizeCustomer(record));
  };
  const save = async (event) => {
    event.preventDefault();
    if (busy.current || (selection?.id && !record)) return;
    const errors = validateCustomer(values); setFields(errors); setError("");
    if (Object.keys(errors).length) { document.getElementById("customer-" + Object.keys(errors)[0])?.focus(); return; }
    busy.current = true; setPending(true);
    try {
      await customerRequest("/api/admin/customers" + (record ? "/" + record.id : ""), {
        method: record ? "PATCH" : "POST",
        body: { ...normalizeCustomer(values), ...(record ? { revision: record.revision } : {}) },
      });
      if (mounted.current) { onChanged(record ? "Customer updated." : "Customer created."); onClose(); }
    } catch (cause) {
      if (mounted.current) { setError(cause.message); setFields(cause.fields || {}); setConflict(cause.status === 409); }
    } finally { busy.current = false; if (mounted.current) setPending(false); }
  };
  const remove = async () => {
    if (busy.current || !record) return;
    busy.current = true; setPending(true); setError("");
    try {
      await customerRequest("/api/admin/customers/" + record.id, { method: "DELETE", body: { revision: record.revision, confirmation: "delete-customer" } });
      if (mounted.current) { onChanged("Customer deleted."); onClose(); }
    } catch (cause) {
      if (mounted.current) { setError(cause.message); setConflict(cause.status === 409); }
    } finally { busy.current = false; if (mounted.current) setPending(false); }
  };
  const title = mode === "create" ? "Create customer" : mode === "edit" ? "Edit customer" : mode === "delete" ? "Delete customer?" : "Customer details";
  const ready = !selection?.id || Boolean(record);
  const editing = mode === "create" || mode === "edit";

  return <PrototypeDialog open={Boolean(selection)} onClose={close} labelledBy="customer-dialog-heading" dismissible={!pending}>
    <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-zinc-200 bg-white-500 px-4 py-4 sm:px-6">
      <h2 id="customer-dialog-heading" className="min-w-0 break-words text-lg font-medium">{title}</h2>
      <button type="button" disabled={pending} onClick={close} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40" title="Close customer" aria-label="Close customer"><X className="h-5 w-5" aria-hidden="true" /></button>
    </div>
    {loading ? <div role="status" className="flex min-h-[220px] items-center justify-center gap-2 text-sm text-zinc-500"><LoaderCircle className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />Loading customer...</div> : <>
      {error && <div role="alert" className="mx-4 mt-4 rounded-md border border-primary/20 bg-primary-light p-3 text-sm leading-6 text-primary sm:mx-6">
        {error}
        {((!record && selection?.id) || conflict) && <button type="button" disabled={pending} onClick={() => setReload((value) => value + 1)} className="mt-2 block min-h-[44px] rounded px-2 font-medium underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Reload customer</button>}
      </div>}
      {!ready ? <div className="px-4 py-5 sm:px-6"><button type="button" onClick={close} className={secondaryClass}>Close</button></div> : editing ? <form onSubmit={save} noValidate aria-busy={pending}>
        <div className="grid grid-cols-1 gap-5 px-4 py-5 sm:grid-cols-2 sm:px-6">
          {customerFields.map((field) => <div key={field.id} className={"min-w-0 " + (field.id === "address" ? "sm:col-span-2" : "")}>
            <label htmlFor={"customer-" + field.id} className="mb-2 block text-sm font-medium text-zinc-700">{field.label}{customerRequiredFields.includes(field.id) && <> <span className="text-primary" aria-hidden="true">*</span></>}</label>
            {field.id === "address" ? <textarea id="customer-address" name="address" rows={4} maxLength={customerLimits.address} autoComplete={field.complete} disabled={pending} value={values.address} onChange={(event) => { setValues((current) => ({ ...current, address: event.target.value })); setFields((current) => ({ ...current, address: "" })); }} aria-invalid={Boolean(fields.address)} aria-describedby={fields.address ? "customer-address-error" : undefined} className={inputClass + " resize-y " + (fields.address ? "border-primary" : "border-zinc-200")} /> : <input id={"customer-" + field.id} name={field.id} type={field.type || "text"} autoComplete={field.complete} autoFocus={mode === "create" && field.id === "name"} maxLength={customerLimits[field.id]} required={customerRequiredFields.includes(field.id)} disabled={pending} value={values[field.id]} onChange={(event) => { setValues((current) => ({ ...current, [field.id]: event.target.value })); setFields((current) => ({ ...current, [field.id]: "" })); }} aria-invalid={Boolean(fields[field.id])} aria-describedby={fields[field.id] ? "customer-" + field.id + "-error" : undefined} className={inputClass + " " + (fields[field.id] ? "border-primary" : "border-zinc-200")} />}
            {fields[field.id] && <p id={"customer-" + field.id + "-error"} className="mt-1.5 text-xs text-primary">{fields[field.id]}</p>}
          </div>)}
        </div>
        <div className={footerClass}>
          <button type="button" disabled={pending} onClick={close} className={secondaryClass}>Cancel</button>
          <button type="submit" disabled={pending || conflict} aria-label={pending ? "Saving customer" : "Save customer"} className={primaryClass}>{pending ? <LoaderCircle className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Save className="h-4 w-4 shrink-0" aria-hidden="true" />}{pending ? "Saving..." : "Save"}</button>
        </div>
      </form> : mode === "delete" && record ? <>
        <div className="space-y-4 px-4 py-5 text-sm leading-6 sm:px-6"><p className="text-zinc-700">Permanently delete <strong className="break-words">{record.name}</strong>{record.company_name && <> from <strong className="break-words">{record.company_name}</strong></>}?</p><p className="text-zinc-500">This cannot be undone.</p></div>
        <div className={footerClass}><button type="button" autoFocus disabled={pending} onClick={close} className={secondaryClass}>Cancel</button><button type="button" disabled={pending || conflict} onClick={remove} aria-label="Confirm customer deletion" className={primaryClass}>{pending ? <LoaderCircle className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Trash2 className="h-4 w-4 shrink-0" aria-hidden="true" />}{pending ? "Deleting..." : "Delete"}</button></div>
      </> : record && <>
        <div className="space-y-6 px-4 py-5 sm:px-6">
          <div className="flex min-w-0 items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary-light text-primary"><UserRound className="h-5 w-5" aria-hidden="true" /></span><div className="min-w-0"><h3 className="break-words text-lg font-medium">{record.name}</h3>{record.company_name && <p className="mt-1 flex items-start gap-2 break-words text-sm leading-6 text-zinc-500"><Building2 className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" /><span className="min-w-0">{record.company_name}</span></p>}</div></div>
          <dl className="grid gap-5 text-sm sm:grid-cols-2">
            {record.email && <div className="min-w-0 sm:col-span-2"><dt className="text-xs text-zinc-500">Email</dt><dd className="mt-1"><a href={"mailto:" + encodeURIComponent(record.email)} className="inline-flex min-h-[44px] max-w-full items-center gap-2 text-zinc-700 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Mail className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="min-w-0 break-all">{record.email}</span></a></dd></div>}
            <div className="min-w-0"><dt className="text-xs text-zinc-500">Phone number</dt><dd className="mt-1"><a href={"tel:" + record.phone.replace(/[^+\d]/g, "")} className="inline-flex min-h-[44px] max-w-full items-center gap-2 text-zinc-700 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Phone className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="min-w-0 break-all">{record.phone}</span></a></dd></div>
            {record.address && <div className="min-w-0 sm:col-span-2"><dt className="text-xs text-zinc-500">Address</dt><dd className="mt-2 flex items-start gap-2 leading-6 text-zinc-700"><MapPin className="mt-1 h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" /><span className="min-w-0 whitespace-pre-wrap break-words">{record.address}</span></dd></div>}
          </dl>
        </div>
        <div className={footerClass}><button type="button" onClick={() => changeMode("delete")} className={secondaryClass + " text-primary"}><Trash2 className="h-4 w-4 shrink-0" aria-hidden="true" />Delete</button><button type="button" onClick={() => changeMode("edit")} className={primaryClass}><Pencil className="h-4 w-4 shrink-0" aria-hidden="true" />Edit</button></div>
      </>}
    </>}
  </PrototypeDialog>;
}
