import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { ArrowLeft, Building2, ChevronDown, LoaderCircle, Plus, Save, Trash2, Users } from "lucide-react";
import { formatQuotationAmount, MAX_QUOTATION_ITEMS, quotationSubtotal, quotationToday } from "../../utils/adminQuotation";
import { documentApi, documentQuantity, normalizeSalesDocument, salesDocumentType, validateSalesDocument } from "../../utils/adminSalesDocument";
import { salesDocumentRequest } from "../../lib/sales-documents/browser";
import QuotationPicker from "./QuotationPicker";
import PendingBusinessLayout from "./PendingBusinessLayout";

const input = "min-h-[44px] w-full min-w-0 rounded-md border border-zinc-200 bg-white-500 px-3 py-2.5 text-base text-zinc-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-zinc-50 sm:text-sm";
const tool = "flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40";

export default function SalesDocumentForm({ kind, initialBusinessId = "" }) {
  const type = salesDocumentType(kind); const api = documentApi(kind); const router = useRouter();
  const [business, setBusiness] = useState(null); const [customer, setCustomer] = useState(null);
  const [values, setValues] = useState(() => ({ date: quotationToday(), customer_reference: "", delivery_address: "", items: [] }));
  const [picker, setPicker] = useState(null); const [businessLoading, setBusinessLoading] = useState(false);
  const [pending, setPending] = useState(false); const [error, setError] = useState(""); const [fields, setFields] = useState({});
  const busy = useRef(false); const request = useRef(null); const businessSelection = useRef(0); const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const chooseBusiness = async (record) => {
    const turn = ++businessSelection.current;
    setBusinessLoading(true); setBusiness(null); setError(""); setFields((current) => ({ ...current, business_id: "" }));
    try {
      const result = await salesDocumentRequest(api + "/options?" + new URLSearchParams({ directory: "business", id: record.id }));
      if (mounted.current && turn === businessSelection.current) setBusiness(result);
    } catch (cause) { if (mounted.current && turn === businessSelection.current) setError(cause.message); }
    finally { if (mounted.current && turn === businessSelection.current) setBusinessLoading(false); }
  };
  useEffect(() => { if (initialBusinessId) chooseBusiness({ id: initialBusinessId }); }, [initialBusinessId]);
  useEffect(() => {
    const warn = (event) => { if (values.items.length && !busy.current) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [values.items.length]);
  const change = (key, value) => { setValues((current) => ({ ...current, [key]: value })); setFields((current) => ({ ...current, [key]: "" })); };
  const itemChange = (index, key, value) => {
    setValues((current) => ({ ...current, items: current.items.map((item, position) => position === index ? { ...item, [key]: value } : item) }));
    setFields((current) => ({ ...current, [`items.${index}.${key}`]: "", items: "" }));
  };
  const chooseCustomer = (record) => {
    setCustomer(record); setFields((current) => ({ ...current, customer_id: "" }));
    if (!type.priced) setValues((current) => ({ ...current, delivery_address: !current.delivery_address || current.delivery_address === customer?.address ? record.address || "" : current.delivery_address }));
  };
  const addProducts = (records) => {
    setValues((current) => ({ ...current, items: [...current.items, ...records.filter((record) => !current.items.some((item) => item.product_id === record.id)).map((record) => ({
      key: window.crypto.randomUUID(), product_id: record.id, revision: record.revision, name: record.name, description: record.name, unit: record.unit, quantity: "1", ...(type.priced ? { price: String(record.price) } : {}),
    }))].slice(0, MAX_QUOTATION_ITEMS) })); setFields({});
  };
  const submit = async (event) => {
    event.preventDefault(); if (busy.current || businessLoading) return;
    const body = normalizeSalesDocument(kind, { ...values, business_id: business?.id, business_revision: business?.revision, customer_id: customer?.id, customer_revision: customer?.revision });
    const errors = validateSalesDocument(kind, body);
    if (business && !business.document_layout) errors.business_id = "Approve the business document layout first.";
    setFields(errors); setError("");
    if (Object.keys(errors).length) { document.getElementById("document-" + Object.keys(errors)[0])?.focus(); return; }
    busy.current = true; setPending(true);
    const fingerprint = JSON.stringify(body);
    if (request.current?.fingerprint !== fingerprint) request.current = { fingerprint, id: window.crypto.randomUUID() };
    try {
      const saved = await salesDocumentRequest(api, { method: "POST", body: { ...body, request_id: request.current.id } });
      await router.push(type.route + "/" + saved.id);
    } catch (cause) { if (mounted.current) { setError(cause.message); setFields(cause.fields || {}); } }
    finally { busy.current = false; if (mounted.current) setPending(false); }
  };
  const total = type.priced ? quotationSubtotal(values.items) : documentQuantity(values.items);
  const canSave = Boolean(business?.document_layout && customer && values.items.length && !businessLoading);
  const errorText = (key) => fields[key] ? <p id={"document-" + key + "-error"} className="mt-1.5 text-xs leading-5 text-primary">{fields[key]}</p> : null;
  const attributes = (key) => ({ id: "document-" + key, "aria-invalid": Boolean(fields[key]), "aria-describedby": fields[key] ? "document-" + key + "-error" : undefined });
  const textField = (key, label, { date = false, rows = 0, maxLength, required = false } = {}) => <div className="min-w-0">
    <label htmlFor={"document-" + key} className="mb-2 block text-sm font-medium text-zinc-700">{label}{required && <span className="text-primary" aria-hidden="true"> *</span>}</label>
    {rows ? <textarea {...attributes(key)} rows={rows} maxLength={maxLength} value={values[key]} onChange={(event) => change(key, event.target.value)} className={input + " resize-y"} /> : <input {...attributes(key)} type={date ? "date" : "text"} min={date ? "2000-01-01" : undefined} max={date ? "2099-12-31" : undefined} maxLength={maxLength} required={required} value={values[key]} onChange={(event) => change(key, event.target.value)} className={input} />}
    {errorText(key)}
  </div>;
  const pickerButton = (directory, record, Icon) => <div className="min-w-0">
    <label className="mb-2 block text-sm font-medium text-zinc-700" htmlFor={"document-" + directory + "_id"}>{directory === "business" ? "Business" : "Customer"} <span className="text-primary" aria-hidden="true">*</span></label>
    <button {...attributes(directory + "_id")} type="button" disabled={pending || businessLoading && directory === "business"} onClick={() => setPicker(directory)} className={"flex min-h-[56px] w-full items-center gap-3 rounded-md border bg-white-500 px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 " + (fields[directory + "_id"] ? "border-primary" : "border-zinc-200")}>
      <Icon className="h-5 w-5 shrink-0 text-zinc-400" aria-hidden="true" /><span className="min-w-0 flex-1 break-words text-sm text-zinc-900">{businessLoading && directory === "business" ? "Loading business..." : record?.name || "Choose " + directory}{record && <span className="mt-1 block break-words text-xs leading-5 text-zinc-500">{directory === "business" ? record.document_layout?.name || "Format not configured" : record.company_name}</span>}</span><ChevronDown className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
    </button>{errorText(directory + "_id")}
    {directory === "business" && business && !business.document_layout && <PendingBusinessLayout businessId={business.id} disabled={pending || businessLoading} onCheck={() => chooseBusiness(business)} />}
  </div>;

  return <form onSubmit={submit} noValidate aria-busy={pending} className="min-w-0 space-y-6">
    <Link href={type.route + (initialBusinessId ? "?business=" + initialBusinessId : "")}><a className="inline-flex min-h-[44px] items-center gap-2 rounded text-sm text-zinc-500 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary"><ArrowLeft className="h-4 w-4" aria-hidden="true" />{type.plural}</a></Link>
    {error && <p role="alert" className="rounded-md border border-primary/20 bg-primary-light p-4 text-sm leading-6 text-primary">{error}</p>}
    <fieldset disabled={pending} className="min-w-0 space-y-5 border-y border-zinc-200 bg-white-500 px-4 py-5 sm:px-6">
      <legend className="sr-only">{type.name} details</legend><h2 className="text-base font-medium">{type.name} details</h2>
      <div className="grid min-w-0 gap-5 sm:grid-cols-2">
        {pickerButton("business", business, Building2)}{pickerButton("customer", customer, Users)}
        {textField("date", "Date", { date: true, required: true })}
        {kind === "invoice" && textField("customer_reference", "PO number", { maxLength: 100 })}
      </div>
      {customer && <p className="break-words text-sm leading-6 text-zinc-500">{customer.address && <span className="block whitespace-pre-wrap">{customer.address}</span>}<span className="block break-all">{[customer.phone, customer.email].filter(Boolean).join(" | ")}</span></p>}
      {!type.priced && textField("delivery_address", "Delivery address", { rows: 3, maxLength: 2000 })}
    </fieldset>
    <section aria-labelledby="document-items-heading" className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="document-items-heading" className="text-base font-medium">Items <span className="ml-2 text-xs font-normal tabular-nums text-zinc-400">{values.items.length}</span></h2><button id="document-items" type="button" disabled={pending || values.items.length >= MAX_QUOTATION_ITEMS} onClick={() => setPicker("product")} className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-zinc-200 bg-white-500 px-4 text-sm font-medium text-zinc-700 focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"><Plus className="h-4 w-4" aria-hidden="true" />Add products</button></div>{errorText("items")}
      {!values.items.length ? <div className="flex min-h-[160px] items-center justify-center border-y border-dashed border-zinc-200 bg-white-500"><button type="button" disabled={pending} onClick={() => setPicker("product")} className="inline-flex min-h-[44px] items-center gap-2 rounded-md px-4 text-sm font-medium text-primary focus-visible:ring-2 focus-visible:ring-primary"><Plus className="h-4 w-4" aria-hidden="true" />Add products</button></div> : <ol className="space-y-3">{values.items.map((item, index) => <li key={item.key} className="min-w-0 rounded-lg border border-zinc-200 bg-white-500 p-4 sm:p-5">
        <div className="mb-3 flex min-w-0 items-start justify-between gap-3"><h3 className="min-w-0 break-words pt-2 text-sm font-medium"><span className="mr-2 text-zinc-400">{index + 1}.</span>{item.name}</h3><button type="button" disabled={pending} onClick={() => { setValues((current) => ({ ...current, items: current.items.filter((_, position) => position !== index) })); setFields({}); }} className={tool} title="Remove item" aria-label={"Remove " + item.name}><Trash2 className="h-4 w-4" aria-hidden="true" /></button></div>
        <fieldset disabled={pending} className={"grid min-w-0 gap-4 " + (type.priced ? "sm:grid-cols-[minmax(0,1fr)_260px]" : "sm:grid-cols-[minmax(0,1fr)_120px]")}>
          <legend className="sr-only">Item {index + 1}</legend><div className="min-w-0"><label htmlFor={`document-items.${index}.description`} className="mb-2 block text-xs text-zinc-500">Description</label><textarea {...attributes(`items.${index}.description`)} rows={2} required maxLength={500} value={item.description} onChange={(event) => itemChange(index, "description", event.target.value)} className={input + " resize-y"} />{errorText(`items.${index}.description`)}</div>
          <div className={"grid min-w-0 gap-3 " + (type.priced ? "grid-cols-2" : "grid-cols-1")}>
            {["quantity", ...(type.priced ? ["price"] : [])].map((key) => <div key={key} className="min-w-0"><label htmlFor={`document-items.${index}.${key}`} className="mb-2 block text-xs text-zinc-500">{key === "quantity" ? "Quantity" + (item.unit ? " (" + item.unit + ")" : "") : "Unit price (PKR)"}</label><input {...attributes(`items.${index}.${key}`)} type="text" inputMode="numeric" pattern="[0-9]*" maxLength={key === "quantity" ? 7 : 10} required value={item[key]} onChange={(event) => itemChange(index, key, event.target.value)} className={input + " tabular-nums"} />{errorText(`items.${index}.${key}`)}</div>)}
          </div>
        </fieldset>
        {type.priced && <div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-zinc-100 pt-3 text-sm"><span className="text-zinc-500">Amount</span><strong className="min-w-0 break-all font-medium tabular-nums text-zinc-900">{Number.isSafeInteger(Number(item.quantity) * Number(item.price)) && /^\d+$/.test(item.quantity) && /^\d+$/.test(item.price) ? formatQuotationAmount(Number(item.quantity) * Number(item.price)) : "-"}</strong></div>}{errorText(`items.${index}.product_id`)}
      </li>)}</ol>}
    </section>
    <footer className="sticky bottom-0 z-20 grid grid-cols-1 gap-3 border-t border-zinc-200 bg-white-500 px-4 py-4 shadow-t sm:flex sm:items-center sm:justify-between sm:px-6"><div className="flex flex-wrap items-center justify-between gap-2 sm:block"><span className="text-xs text-zinc-500">{type.priced ? "Total" : "Total quantity"}</span><strong className="min-w-0 break-all text-lg font-medium tabular-nums sm:ml-3">{Number.isSafeInteger(total) && total >= 0 ? type.priced ? formatQuotationAmount(total) : total.toLocaleString("en-PK") : "-"}</strong></div><button type="submit" disabled={pending || !canSave} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50">{pending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}{pending ? "Saving..." : "Save " + type.singular}</button></footer>
    {picker && <QuotationPicker key={picker} kind={picker} optionsUrl={api + "/options"} directoryParam="directory" request={salesDocumentRequest} showPrices={type.priced} onClose={() => setPicker(null)} existingProducts={values.items.map((item) => item.product_id)} onSelect={picker === "business" ? chooseBusiness : picker === "customer" ? chooseCustomer : addProducts} />}
  </form>;
}
