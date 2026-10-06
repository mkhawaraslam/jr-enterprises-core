import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, ImagePlus, LoaderCircle, X } from "lucide-react";
import { createQuoteRequest, emptyQuoteRequest, formatQuoteFileSize, MAX_QUOTE_IMAGES, QUOTE_IMAGE_TYPES, validateQuoteImages, validateQuoteRequest } from "../utils/quoteRequest";
import { quoteApiRequest, uploadQuotePhotos } from "../lib/quotes/browser";

const inputClassName = "block w-full min-w-0 rounded-md border border-gray-500 bg-white-500 px-3 py-3 text-base text-black-600 transition-colors placeholder:text-black-500/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 [&[aria-invalid=true]]:border-primary";
const primaryButtonClassName = "inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover active:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70";
const secondaryButtonClassName = "inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-md border border-gray-500 bg-white-500 px-6 py-3 text-sm font-medium text-black-600 transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70";
const fields = [
  { name: "fullName", label: "Full name", autoComplete: "name", maxLength: 100, required: true },
  { name: "phone", label: "Phone number", type: "tel", autoComplete: "tel", maxLength: 25, required: true },
  { name: "email", label: "Email address", type: "email", autoComplete: "email", maxLength: 254 },
];

function PhotoPreview({ file, onRemove, disabled }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const preview = URL.createObjectURL(file);
    setUrl(preview);
    return () => URL.revokeObjectURL(preview);
  }, [file]);
  return <li className="flex min-w-0 items-center gap-3 rounded-md border border-gray-100 p-2">
    {url && <img src={url} alt={"Product photo: " + file.name} width={64} height={64} className="h-16 w-16 flex-none rounded object-contain p-1" />}
    <div className="min-w-0 flex-1"><p className="break-all text-sm">{file.name}</p><p className="mt-1 text-xs text-black-500">{formatQuoteFileSize(file.size)}</p></div>
    <button type="button" disabled={disabled} onClick={onRemove} title={"Remove " + file.name} aria-label={"Remove " + file.name} className="flex h-10 w-10 flex-none items-center justify-center rounded-md text-black-500 hover:bg-primary-light hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"><X className="h-4 w-4" aria-hidden="true" /></button>
  </li>;
}

export default function QuoteDialog({ open, onClose }) {
  const dialogRef = useRef(null);
  const formRef = useRef(null);
  const photoInputRef = useRef(null);
  const successHeadingRef = useRef(null);
  const submissionRef = useRef(null);
  const submittingRef = useRef(false);
  const mountedRef = useRef(true);
  const [values, setValues] = useState(emptyQuoteRequest);
  const [photos, setPhotos] = useState([]);
  const [errors, setErrors] = useState({});
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState(null);

  useEffect(() => () => { mountedRef.current = false; }, []);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open) { if (dialog.open) dialog.close(); return; }
    setSuccess(null);
    if (!dialog.open) dialog.showModal();
    formRef.current?.elements.namedItem("fullName")?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);
  useEffect(() => { if (success) successHeadingRef.current?.focus(); }, [success]);

  const changeField = (name, value) => {
    submissionRef.current = null;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
    setFormError("");
  };
  const selectPhotos = (event) => {
    const selected = Array.from(event.target.files);
    event.target.value = "";
    if (!selected.length) return;
    const next = [...photos];
    for (const file of selected) {
      if (!next.some((existing) => existing.name === file.name && existing.size === file.size && existing.lastModified === file.lastModified)) next.push(file);
    }
    const error = validateQuoteImages(next);
    setErrors((current) => ({ ...current, attachment: error }));
    if (!error) { setPhotos(next); submissionRef.current = null; setFormError(""); }
  };
  const removePhoto = (file) => {
    setPhotos((current) => current.filter((photo) => photo !== file));
    submissionRef.current = null;
    setErrors((current) => ({ ...current, attachment: "" }));
    setFormError("");
  };
  const submit = async (event) => {
    event.preventDefault();
    if (submittingRef.current) return;
    const nextErrors = validateQuoteRequest(values, photos);
    setErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length) {
      const first = Object.keys(nextErrors)[0];
      if (first === "attachment") photoInputRef.current?.focus();
      else formRef.current.elements.namedItem(first)?.focus();
      return;
    }
    submittingRef.current = true;
    setPending(true);
    try {
      setProgress("Preparing request...");
      if (!submissionRef.current || submissionRef.current.expiresAt < Date.now()) {
        const request = createQuoteRequest(values);
        const reservation = await quoteApiRequest("/api/quote-requests", {
          ...request, website: formRef.current.elements.namedItem("website").value,
          attachments: photos.map((file) => ({ name: file.name, type: file.type, size: file.size })),
        });
        submissionRef.current = { ...reservation, uploadedPaths: new Set() };
      }
      const reservation = submissionRef.current;
      setProgress(photos.length ? "Uploading product photos..." : "Submitting request...");
      await uploadQuotePhotos(reservation, photos, reservation.uploadedPaths);
      if (mountedRef.current) setProgress("Submitting request...");
      const received = await quoteApiRequest("/api/quote-requests/complete", { id: reservation.id, token: reservation.token });
      if (!mountedRef.current) return;
      setSuccess(received);
      setValues(emptyQuoteRequest);
      setPhotos([]);
      submissionRef.current = null;
    } catch (error) {
      if (!mountedRef.current) return;
      if ([400, 404, 410, 422].includes(error.status)) submissionRef.current = null;
      setFormError(error.message || "Unable to submit your request. Please try again.");
      if (error.fields) setErrors(error.fields);
    } finally {
      submittingRef.current = false;
      if (mountedRef.current) { setPending(false); setProgress(""); }
    }
  };

  return <dialog ref={dialogRef} aria-labelledby="quote-dialog-title" aria-describedby="quote-dialog-description" aria-modal="true" onClose={onClose}
    onCancel={(event) => { if (submittingRef.current) event.preventDefault(); }}
    onClick={(event) => {
      if (event.target !== event.currentTarget || submittingRef.current) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) event.currentTarget.close();
    }}
    className="fixed inset-0 m-auto max-h-[calc(100vh_-_2rem)] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto rounded-lg border-0 bg-white-500 p-0 text-black-600 shadow-xl [&::backdrop]:bg-black-600/50">
    <div className="p-5 sm:p-8">
      <div className="flex items-start justify-between gap-4"><div className="min-w-0"><h2 id="quote-dialog-title" className="text-2xl font-medium leading-tight">Request a Quote</h2><p id="quote-dialog-description" className="mt-2 text-sm leading-relaxed">Product sourcing, availability, and technical guidance.</p></div><button type="button" disabled={pending} onClick={() => dialogRef.current.close()} aria-label="Close quote form" title="Close quote form" className="flex h-10 w-10 flex-none items-center justify-center rounded-md text-black-500 transition-colors hover:bg-primary-light hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"><X className="h-5 w-5" aria-hidden="true" /></button></div>
      {success ? <div className="mt-6">
        <div className="flex items-start gap-3 rounded-md bg-primary-light p-4"><CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-primary" aria-hidden="true" /><div className="min-w-0"><h3 ref={successHeadingRef} tabIndex={-1} className="font-medium focus:outline-none">Request received</h3><p className="mt-2 text-sm leading-relaxed">Thank you. Our team will contact you about your product requirements.</p><p className="mt-3 break-all text-xs text-black-500">Reference: {success.id}</p></div></div>
        <div className="mt-6 flex justify-end"><button type="button" onClick={() => dialogRef.current.close()} className={primaryButtonClassName}>Done</button></div>
      </div> : <form ref={formRef} onSubmit={submit} noValidate aria-busy={pending} className="mt-6">
        <input name="website" type="text" autoComplete="off" tabIndex={-1} aria-hidden="true" className="hidden" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {fields.map((field) => <div key={field.name} className={"min-w-0 " + (field.name === "email" ? "sm:col-span-2" : "")}>
            <label htmlFor={"quote-" + field.name} className="mb-2 block text-sm font-medium">{field.label} {!field.required && <span className="font-normal text-black-500">(optional)</span>}</label>
            <input id={"quote-" + field.name} name={field.name} type={field.type || "text"} autoComplete={field.autoComplete} maxLength={field.maxLength} required={field.required} value={values[field.name]} disabled={pending} onChange={(event) => changeField(field.name, event.target.value)} aria-invalid={Boolean(errors[field.name])} aria-describedby={errors[field.name] ? "quote-" + field.name + "-error" : undefined} className={inputClassName} />
            {errors[field.name] && <p id={"quote-" + field.name + "-error"} className="mt-2 text-sm text-primary" role="alert">{errors[field.name]}</p>}
          </div>)}
          <div className="min-w-0 sm:col-span-2"><label htmlFor="quote-requirements" className="mb-2 block text-sm font-medium">Product requirements</label><textarea id="quote-requirements" name="requirements" rows={4} maxLength={3000} required disabled={pending} placeholder="Product name, model number, quantity, or specifications" value={values.requirements} onChange={(event) => changeField("requirements", event.target.value)} aria-invalid={Boolean(errors.requirements)} aria-describedby={errors.requirements ? "quote-requirements-error" : undefined} className={inputClassName + " min-h-[7rem] resize-y"} />{errors.requirements && <p id="quote-requirements-error" className="mt-2 text-sm text-primary" role="alert">{errors.requirements}</p>}</div>
          <div className="min-w-0 sm:col-span-2"><label htmlFor="quote-photo" className="mb-2 block text-sm font-medium">Product photos <span className="font-normal text-black-500">(optional)</span></label>
            <div className="flex items-center gap-3 rounded-md border border-dashed border-gray-500 p-3 sm:p-4"><ImagePlus className="h-6 w-6 flex-none text-primary" aria-hidden="true" /><div className="min-w-0 flex-1"><input ref={photoInputRef} id="quote-photo" name="attachment" type="file" multiple disabled={pending} accept={QUOTE_IMAGE_TYPES.join(",")} onChange={selectPhotos} aria-invalid={Boolean(errors.attachment)} aria-describedby={"quote-photo-help" + (errors.attachment ? " quote-photo-error" : "")} className="block w-full min-w-0 text-sm text-black-500 file:mr-3 file:rounded file:border-0 file:bg-primary-light file:px-3 file:py-2 file:font-medium file:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" /><p id="quote-photo-help" className="mt-2 text-xs">JPG or PNG. Up to {MAX_QUOTE_IMAGES} photos, 5 MB total.</p></div></div>
            {errors.attachment && <p id="quote-photo-error" className="mt-2 text-sm text-primary" role="alert">{errors.attachment}</p>}
            {photos.length > 0 && <><div className="mt-3 text-xs text-black-500">{photos.length} {photos.length === 1 ? "photo" : "photos"} / {formatQuoteFileSize(photos.reduce((total, photo) => total + photo.size, 0))}</div><ul className="mt-3 space-y-2">{photos.map((file) => <PhotoPreview key={file.name + "-" + file.size + "-" + file.lastModified} file={file} disabled={pending} onRemove={() => removePhoto(file)} />)}</ul></>}
          </div>
        </div>
        {formError && <p role="alert" className="mt-5 text-sm leading-relaxed text-primary">{formError}</p>}
        <div className="mt-5 flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end"><button type="button" disabled={pending} onClick={() => dialogRef.current.close()} className={secondaryButtonClassName}>Cancel</button><button type="submit" disabled={pending} className={primaryButtonClassName}>{pending ? <><LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /><span role="status">{progress}</span></> : <>Submit Request<ArrowRight className="h-4 w-4" aria-hidden="true" /></>}</button></div>
      </form>}
    </div>
  </dialog>;
}
