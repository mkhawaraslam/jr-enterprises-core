import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, ImagePlus, X } from "lucide-react";
import {
  createQuoteRequest,
  emptyQuoteRequest,
  QUOTE_IMAGE_TYPES,
  validateQuoteImage,
  validateQuoteRequest,
} from "../utils/quoteRequest";

const inputClassName = "block w-full min-w-0 rounded-md border border-gray-500 bg-white-500 px-3 py-3 text-base text-black-600 transition-colors placeholder:text-black-500/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 [&[aria-invalid=true]]:border-primary";
const primaryButtonClassName = "inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover active:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";
const secondaryButtonClassName = "inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-md border border-gray-500 bg-white-500 px-6 py-3 text-sm font-medium text-black-600 transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";
const fields = [
  { name: "fullName", label: "Full name", autoComplete: "name", maxLength: 100, required: true },
  { name: "company", label: "Company", autoComplete: "organization", maxLength: 120 },
  { name: "phone", label: "Phone number", type: "tel", autoComplete: "tel", maxLength: 25, required: true },
  { name: "email", label: "Email address", type: "email", autoComplete: "email", maxLength: 254 },
];

export default function QuoteDialog({ open, onClose }) {
  const dialogRef = useRef(null);
  const formRef = useRef(null);
  const photoInputRef = useRef(null);
  const reviewHeadingRef = useRef(null);
  const [values, setValues] = useState(emptyQuoteRequest);
  const [photo, setPhoto] = useState(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [errors, setErrors] = useState({});
  const [review, setReview] = useState(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open) {
      if (dialog.open) dialog.close();
      return;
    }
    setReview(null);
    if (!dialog.open) dialog.showModal();
    formRef.current?.elements.namedItem("fullName")?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!photo) {
      setPhotoUrl("");
      return;
    }
    const url = URL.createObjectURL(photo);
    setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  useEffect(() => {
    if (review) reviewHeadingRef.current?.focus();
    else if (open) formRef.current?.elements.namedItem("fullName")?.focus();
  }, [review, open]);

  const clearPhoto = () => {
    setPhoto(null);
    setErrors((current) => ({ ...current, attachment: "" }));
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const selectPhoto = (event) => {
    const selected = event.target.files[0];
    if (!selected) return;
    const error = validateQuoteImage(selected);
    setErrors((current) => ({ ...current, attachment: error }));
    setPhoto(error ? null : selected);
    if (error) event.target.value = "";
  };

  const reviewRequest = (event) => {
    event.preventDefault();
    const nextErrors = validateQuoteRequest(values, photo);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      const firstField = Object.keys(nextErrors)[0];
      if (firstField === "attachment") photoInputRef.current?.focus();
      else formRef.current.elements.namedItem(firstField)?.focus();
      return;
    }
    // Review only; connect the normalized request and File to a quote endpoint later.
    setReview(createQuoteRequest(values, photo));
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="quote-dialog-title"
      aria-describedby="quote-dialog-description"
      aria-modal="true"
      onClose={onClose}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) {
          event.currentTarget.close();
        }
      }}
      className="fixed inset-0 m-auto max-h-[calc(100vh_-_2rem)] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto rounded-lg border-0 bg-white-500 p-0 text-black-600 shadow-xl backdrop:bg-black-600/50"
    >
      <div className="p-5 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id="quote-dialog-title" className="text-2xl font-medium leading-tight">Request a Quote</h2>
            <p id="quote-dialog-description" className="mt-2 text-sm leading-relaxed">
              Product sourcing, availability, and technical guidance.
            </p>
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current.close()}
            aria-label="Close quote form"
            title="Close quote form"
            className="flex h-10 w-10 flex-none items-center justify-center rounded-md text-black-500 transition-colors hover:bg-primary-light hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {review ? (
          <div className="mt-6">
            <div className="flex items-start gap-3 rounded-md bg-primary-light p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-primary" aria-hidden="true" />
              <div className="min-w-0">
                <h3 ref={reviewHeadingRef} tabIndex={-1} className="font-medium focus:outline-none">Your request is ready for review</h3>
                <p className="mt-1 text-sm leading-relaxed">Not sent. Online submission is not connected yet.</p>
              </div>
            </div>
            <dl className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
              {fields.filter(({ name }) => review[name]).map(({ name, label }) => (
                <div key={name} className="min-w-0">
                  <dt className="text-sm text-black-500">{label}</dt>
                  <dd className="mt-1 break-words font-medium">{review[name]}</dd>
                </div>
              ))}
              <div className="min-w-0 sm:col-span-2">
                <dt className="text-sm text-black-500">Product requirements</dt>
                <dd className="mt-1 whitespace-pre-wrap break-words leading-relaxed">{review.requirements}</dd>
              </div>
              {photo && (
                <div className="min-w-0 sm:col-span-2">
                  <dt className="text-sm text-black-500">Product photo</dt>
                  <dd className="mt-2 flex min-w-0 items-center gap-3">
                    <img src={photoUrl} alt="Attached product" className="h-16 w-16 flex-none rounded-md border border-gray-100 object-contain p-1" />
                    <span className="min-w-0 break-words text-sm">{photo.name}</span>
                  </dd>
                </div>
              )}
            </dl>
            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setReview(null)} className={secondaryButtonClassName}>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Edit Details
              </button>
              <button type="button" onClick={() => dialogRef.current.close()} className={primaryButtonClassName}>Done</button>
            </div>
          </div>
        ) : (
          <form ref={formRef} onSubmit={reviewRequest} noValidate className="mt-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {fields.map((field) => (
                <div key={field.name} className="min-w-0">
                  <label htmlFor={"quote-" + field.name} className="mb-2 block text-sm font-medium">
                    {field.label} {!field.required && <span className="font-normal text-black-500">(optional)</span>}
                  </label>
                  <input
                    id={"quote-" + field.name}
                    name={field.name}
                    type={field.type || "text"}
                    autoComplete={field.autoComplete}
                    maxLength={field.maxLength}
                    required={field.required}
                    value={values[field.name]}
                    onChange={(event) => {
                      setValues((current) => ({ ...current, [field.name]: event.target.value }));
                      setErrors((current) => ({ ...current, [field.name]: "" }));
                    }}
                    aria-invalid={Boolean(errors[field.name])}
                    aria-describedby={errors[field.name] ? "quote-" + field.name + "-error" : undefined}
                    className={inputClassName}
                  />
                  {errors[field.name] && <p id={"quote-" + field.name + "-error"} className="mt-2 text-sm text-primary" role="alert">{errors[field.name]}</p>}
                </div>
              ))}
              <div className="min-w-0 sm:col-span-2">
                <label htmlFor="quote-requirements" className="mb-2 block text-sm font-medium">Product requirements</label>
                <textarea
                  id="quote-requirements"
                  name="requirements"
                  rows={4}
                  maxLength={3000}
                  required
                  placeholder="Product name, model number, quantity, or specifications"
                  value={values.requirements}
                  onChange={(event) => {
                    setValues((current) => ({ ...current, requirements: event.target.value }));
                    setErrors((current) => ({ ...current, requirements: "" }));
                  }}
                  aria-invalid={Boolean(errors.requirements)}
                  aria-describedby={errors.requirements ? "quote-requirements-error" : undefined}
                  className={inputClassName + " min-h-[7rem] resize-y"}
                />
                {errors.requirements && <p id="quote-requirements-error" className="mt-2 text-sm text-primary" role="alert">{errors.requirements}</p>}
              </div>
              <div className="min-w-0 sm:col-span-2">
                <label htmlFor="quote-photo" className="mb-2 block text-sm font-medium">Product photo <span className="font-normal text-black-500">(optional)</span></label>
                <div className="flex items-center gap-3 rounded-md border border-dashed border-gray-500 p-3 sm:p-4">
                  <ImagePlus className="h-6 w-6 flex-none text-primary" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <input
                      ref={photoInputRef}
                      id="quote-photo"
                      name="attachment"
                      type="file"
                      accept={QUOTE_IMAGE_TYPES.join(",")}
                      onChange={selectPhoto}
                      aria-invalid={Boolean(errors.attachment)}
                      aria-describedby={"quote-photo-help" + (errors.attachment ? " quote-photo-error" : "")}
                      className="block w-full min-w-0 text-sm text-black-500 file:mr-3 file:rounded file:border-0 file:bg-primary-light file:px-3 file:py-2 file:font-medium file:text-primary hover:file:bg-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    />
                    <p id="quote-photo-help" className="mt-2 text-xs">JPG, PNG, or WebP. Maximum 5 MB.</p>
                  </div>
                </div>
                {errors.attachment && <p id="quote-photo-error" className="mt-2 text-sm text-primary" role="alert">{errors.attachment}</p>}
                {photo && (
                  <div className="mt-3 flex min-w-0 items-center gap-3">
                    {photoUrl && <img
                      src={photoUrl}
                      alt="Product photo preview"
                      className="h-16 w-16 flex-none rounded-md border border-gray-100 object-contain p-1"
                      onError={() => {
                        clearPhoto();
                        setErrors((current) => ({ ...current, attachment: "This photo could not be opened. Please choose another image." }));
                      }}
                    />}
                    <span className="min-w-0 flex-1 break-words text-sm text-black-500">{photo.name}</span>
                    <button type="button" onClick={clearPhoto} title="Remove photo" aria-label="Remove product photo" className="flex h-10 w-10 flex-none items-center justify-center rounded-md text-black-500 hover:bg-primary-light hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => dialogRef.current.close()} className={secondaryButtonClassName}>Cancel</button>
              <button type="submit" className={primaryButtonClassName}>Review Request <ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
}
