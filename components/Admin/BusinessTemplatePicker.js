import { useEffect, useState } from "react";
import { Check, Files, LayoutTemplate, Upload } from "lucide-react";
import { BUSINESS_IMAGE_LIMIT, BUSINESS_IMAGE_TYPES } from "../../utils/adminBusiness";
import { businessTemplates, documentTypes, findBusinessTemplate } from "../../utils/businessTemplates";
import BusinessDocumentPreview from "./BusinessDocumentPreview";

function useImagePreview(file) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!file || !BUSINESS_IMAGE_TYPES.includes(file.type) || file.size > BUSINESS_IMAGE_LIMIT) { setUrl(null); return; }
    const preview = URL.createObjectURL(file); setUrl(preview);
    return () => URL.revokeObjectURL(preview);
  }, [file]);
  return url;
}

function TemplateThumbnail({ id }) {
  const ledger = id === "ledger";
  return <div aria-hidden="true" className={"flex h-20 items-center justify-center overflow-hidden bg-zinc-100 p-2 " + (id === "minimal" ? "border-t-2 border-zinc-800" : ledger ? "border-l-4 border-emerald-700" : "border-t-4 border-primary")}>
    <div className="h-16 w-20 bg-white-500 p-2 shadow-sm"><div className={"mb-2 flex justify-between " + (ledger ? "flex-row-reverse" : "")}><div className={"h-3 w-4 " + (ledger ? "bg-emerald-100" : id === "minimal" ? "bg-zinc-300" : "bg-primary-light")} /><div className="w-7 space-y-1"><div className="h-0.5 bg-zinc-400" /><div className="h-0.5 bg-zinc-200" /></div></div><div className={"mb-1 h-2 " + (ledger ? "bg-emerald-100" : id === "minimal" ? "border-y border-zinc-700" : "bg-primary")} /><div className="space-y-1"><div className="h-0.5 bg-zinc-200" /><div className="h-0.5 bg-zinc-200" /><div className="ml-auto h-0.5 w-6 bg-zinc-400" /></div></div>
  </div>;
}

export default function BusinessTemplatePicker({ values, assets = {}, images = {}, fields = {}, disabled = false, readOnly = false, onChange, customUpload }) {
  const [documentType, setDocumentType] = useState("quotation");
  const [previewTemplate, setPreviewTemplate] = useState(null);
  useEffect(() => { setPreviewTemplate(null); }, [values.billing_mode, values.template_id, values.template_version]);
  const logo = useImagePreview(images.logo);
  const signature = useImagePreview(images.signature);
  const savedTemplate = findBusinessTemplate(values.template_id, values.template_version);
  const selectedTemplate = previewTemplate || savedTemplate || businessTemplates[0];
  const business = { ...values, logo: images.logo ? { url: logo } : assets.logo, signature: images.signature ? { url: signature } : assets.signature };
  const chooseTemplate = (template) => {
    if (readOnly || values.billing_mode === "custom") setPreviewTemplate(template);
    else onChange({ template_id: template.id, template_version: template.version });
  };
  const selectTab = (event, index) => {
    let next;
    if (event.key === "ArrowRight") next = (index + 1) % documentTypes.length;
    if (event.key === "ArrowLeft") next = (index + documentTypes.length - 1) % documentTypes.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = documentTypes.length - 1;
    if (next === undefined) return;
    event.preventDefault(); setDocumentType(documentTypes[next].id);
    document.getElementById("business-preview-tab-" + documentTypes[next].id)?.focus();
  };
  return <section className="min-w-0 space-y-4" aria-labelledby="business-document-format-heading">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 id="business-document-format-heading" className="text-sm font-medium">Document format</h3>{readOnly && <span className="text-xs text-zinc-500">{values.billing_mode === "custom" ? "Custom format" : (savedTemplate?.name || "Unavailable template") + " / v" + values.template_version}</span>}</div>
    {!readOnly && <fieldset disabled={disabled} aria-describedby={fields.billing_mode ? "business-billing_mode-error" : undefined}><legend className="sr-only">Document format source</legend><div className="grid grid-cols-2 gap-2">{[{ id: "builtin", name: "Built-in template", Icon: LayoutTemplate }, { id: "custom", name: "Custom format", Icon: Upload }].map(({ id, name, Icon }) => <label key={id} className={"flex min-h-[48px] cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-primary " + (values.billing_mode === id ? "border-primary bg-primary-light text-primary" : "border-zinc-200 text-zinc-600 hover:bg-zinc-50") + (disabled ? " pointer-events-none opacity-50" : "")}><input id={"business-billing_mode" + (id === "custom" ? "-custom" : "")} type="radio" name="billing_mode" value={id} checked={values.billing_mode === id} onChange={() => onChange({ billing_mode: id, ...(id === "builtin" ? { template_id: selectedTemplate.id, template_version: selectedTemplate.version } : {}) })} className="h-4 w-4 shrink-0 accent-primary" /><Icon className="hidden h-4 w-4 shrink-0 sm:block" aria-hidden="true" /><span className="min-w-0 break-words">{name}</span></label>)}</div></fieldset>}
    {fields.billing_mode && <p id="business-billing_mode-error" className="text-xs text-primary">{fields.billing_mode}</p>}
    {!readOnly && values.billing_mode === "custom" && customUpload}
    <fieldset disabled={disabled} aria-describedby={fields.template_id ? "business-template_id-error" : undefined}><legend className="mb-2 text-xs text-zinc-500">{values.billing_mode === "custom" ? "Built-in samples" : readOnly ? "Preview designs" : "Template design"}</legend><div className="grid grid-cols-3 gap-2">{businessTemplates.map((template, index) => <label key={template.id + template.version} className={"relative min-w-0 cursor-pointer overflow-hidden rounded-md border focus-within:ring-2 focus-within:ring-primary " + (selectedTemplate.id === template.id && selectedTemplate.version === template.version ? "border-primary" : "border-zinc-200 hover:border-zinc-400") + (disabled ? " pointer-events-none opacity-50" : "")}><input id={index === 0 ? "business-template_id" : "business-template_id-" + template.id} type="radio" name="document_template" checked={selectedTemplate.id === template.id && selectedTemplate.version === template.version} onChange={() => chooseTemplate(template)} className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0" aria-label={template.name + " template version " + template.version} /><TemplateThumbnail id={template.id} /><div className="flex min-h-[44px] items-center justify-between gap-1 px-2 py-2"><span className="min-w-0 break-words text-xs font-medium text-zinc-700">{template.name}</span>{selectedTemplate.id === template.id && selectedTemplate.version === template.version && <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />}</div></label>)}</div></fieldset>
    {fields.template_id && <p id="business-template_id-error" className="text-xs text-primary">{fields.template_id}</p>}
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 pt-4"><h4 className="inline-flex items-center gap-2 text-sm font-medium"><Files className="h-4 w-4 text-zinc-400" aria-hidden="true" />{values.billing_mode === "custom" ? "Built-in sample preview" : "Sample preview"}</h4><span className="shrink-0 text-xs text-zinc-500">{selectedTemplate.name} / v{selectedTemplate.version}</span></div>
    <div role="tablist" aria-label="Document preview type" className="grid grid-cols-3 border-b border-zinc-200">{documentTypes.map((type, index) => <button key={type.id} id={"business-preview-tab-" + type.id} type="button" role="tab" tabIndex={documentType === type.id ? 0 : -1} aria-selected={documentType === type.id} aria-controls="business-document-preview-panel" onClick={() => setDocumentType(type.id)} onKeyDown={(event) => selectTab(event, index)} className={"flex min-h-[48px] min-w-0 items-center justify-center border-b-2 px-2 py-2 text-center text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary " + (documentType === type.id ? "border-primary text-primary" : "border-transparent text-zinc-500 hover:text-zinc-800")}>{type.name}</button>)}</div>
    <div id="business-document-preview-panel" role="tabpanel" tabIndex={0} aria-labelledby={"business-preview-tab-" + documentType} className="max-h-[560px] overflow-auto border border-zinc-200 bg-zinc-100 p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      <BusinessDocumentPreview business={business} templateId={selectedTemplate.id} templateVersion={selectedTemplate.version} documentType={documentType} />
    </div>
  </section>;
}
