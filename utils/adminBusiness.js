import { defaultBillingPreference, findBusinessTemplate, normalizeBillingPreference } from "./businessTemplates";

export const BUSINESS_ASSET_BUCKET = "business-assets";
export const BUSINESS_PAGE_SIZE = 12;
export const BUSINESS_IMAGE_LIMIT = 2 * 1024 * 1024;
export const BUSINESS_IMAGE_TOTAL_LIMIT = 3 * 1024 * 1024;
export const BUSINESS_IMAGE_TYPES = ["image/jpeg", "image/png"];
export const BUSINESS_BILLING_TYPES = ["application/pdf", ...BUSINESS_IMAGE_TYPES];
export const emptyBusiness = { name: "", ntn: "", email: "", phone: "", address: "", special_notes: "", ...defaultBillingPreference };
export const businessLimits = { name: 150, ntn: 30, email: 254, phone: 25, address: 1000, special_notes: 5000 };

export function normalizeBusiness(values) {
  return { ...Object.fromEntries(Object.keys(businessLimits).map((key) => [key, typeof values?.[key] === "string" ? values[key].trim() : ""])), ...normalizeBillingPreference(values) };
}

export function validateBusiness(values, images = {}, existing = {}, billingFormat = null, removeBillingFormat = false) {
  const business = normalizeBusiness(values);
  const errors = {};
  const labels = { name: "business name", ntn: "NTN number", email: "email", phone: "phone number", address: "address" };
  for (const key of Object.keys(businessLimits)) {
    if (!business[key] && key !== "special_notes") errors[key] = `Enter the ${labels[key]}.`;
    else if (business[key].length > businessLimits[key]) errors[key] = `Use ${businessLimits[key]} characters or fewer.`;
  }
  if (business.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(business.email)) errors.email = "Enter a valid email address.";
  if (business.phone && (!/^[+\d\s().-]+$/.test(business.phone) || business.phone.replace(/\D/g, "").length < 7)) errors.phone = "Enter a valid phone number.";
  if (business.ntn && !/^[a-z\d -]+$/i.test(business.ntn)) errors.ntn = "Use letters, numbers, spaces or hyphens for NTN.";
  if (!["builtin", "custom"].includes(business.billing_mode)) errors.billing_mode = "Choose a document format.";
  if (!findBusinessTemplate(business.template_id, business.template_version)) errors.template_id = "Choose an available document template.";
  if (business.billing_mode === "custom" && !billingFormat && (!existing?.billing_format?.path || removeBillingFormat)) errors.billingFormat = "Upload a custom format or choose a built-in template.";
  if (business.billing_mode === "builtin" && billingFormat) errors.billingFormat = "Choose Custom format before uploading a file.";
  let total = 0;
  for (const slot of ["logo", "signature"]) {
    const file = images?.[slot];
    if (!file && !existing?.[slot]?.path) errors[slot] = `Add the business ${slot}.`;
    if (!file) continue;
    if (!BUSINESS_IMAGE_TYPES.includes(file.type) || typeof file.name !== "string" || !/\.(jpe?g|png)$/i.test(file.name)) errors[slot] = "Only JPG and PNG images are accepted.";
    else if (!Number.isSafeInteger(file.size) || file.size <= 0 || file.size > BUSINESS_IMAGE_LIMIT) errors[slot] = "Choose an image up to 2 MB.";
    else total += file.size;
  }
  if (billingFormat) {
    const extension = billingFormat.type === "application/pdf" ? /\.pdf$/i : /\.(jpe?g|png)$/i;
    if (!BUSINESS_BILLING_TYPES.includes(billingFormat.type) || typeof billingFormat.name !== "string" || !extension.test(billingFormat.name)) errors.billingFormat = "Only PDF, JPG and PNG files are accepted.";
    else if (!Number.isSafeInteger(billingFormat.size) || billingFormat.size <= 0 || billingFormat.size > BUSINESS_IMAGE_LIMIT) errors.billingFormat = "Choose a billing format up to 2 MB.";
    else total += billingFormat.size;
  }
  if (total > BUSINESS_IMAGE_TOTAL_LIMIT) errors.images = "Selected uploads must be 3 MB or smaller in total.";
  return errors;
}
