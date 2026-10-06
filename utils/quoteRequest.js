export const MAX_QUOTE_IMAGE_SIZE = 5 * 1024 * 1024;
export const MAX_QUOTE_IMAGES = 10;
export const QUOTE_IMAGE_TYPES = ["image/jpeg", "image/png"];
export const QUOTE_PHOTO_BUCKET = "quote-request-photos";
export const QUOTE_PAGE_SIZE = 10;

export const emptyQuoteRequest = {
  fullName: "",
  phone: "",
  email: "",
  requirements: "",
};

export function validateQuoteImage(file) {
  if (!file) return "";
  if (!QUOTE_IMAGE_TYPES.includes(file.type) || !/\.(jpe?g|png)$/i.test(file.name || "")) return "Only JPG and PNG photos are accepted.";
  if (!Number.isSafeInteger(file.size) || file.size <= 0) return "This photo is empty or invalid. Please choose another file.";
  if (file.size > MAX_QUOTE_IMAGE_SIZE) return "Photos must be 5 MB or smaller in total.";
  return "";
}

export function validateQuoteImages(files = []) {
  if (!Array.isArray(files) || files.length > MAX_QUOTE_IMAGES) return `Choose no more than ${MAX_QUOTE_IMAGES} photos.`;
  for (const file of files) {
    if (!file || typeof file !== "object") return "Choose valid JPG or PNG photos.";
    const error = validateQuoteImage(file);
    if (error) return error;
  }
  if (files.reduce((total, file) => total + file.size, 0) > MAX_QUOTE_IMAGE_SIZE) return "Photos must be 5 MB or smaller in total.";
  return "";
}

export function createQuoteRequest(values, attachments = []) {
  return {
    ...Object.fromEntries(Object.keys(emptyQuoteRequest).map((key) => [key, typeof values?.[key] === "string" ? values[key].trim() : ""])),
    attachments,
  };
}

export function validateQuoteRequest(values, attachments = []) {
  const request = createQuoteRequest(values, attachments);
  const errors = {};
  for (const key of Object.keys(emptyQuoteRequest)) {
    if (/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(request[key])) errors[key] = "Remove unsupported control characters from this field.";
  }
  if (!request.fullName) errors.fullName = "Enter your full name";
  else if (request.fullName.length > 100) errors.fullName = "Use 100 characters or fewer for your name.";
  const phoneDigits = request.phone.replace(/\D/g, "");
  if (!request.phone) {
    errors.phone = "Enter a phone number";
  } else if (request.phone.length > 25 || !/^\+?[\d\s().-]+$/.test(request.phone) || phoneDigits.length < 7 || phoneDigits.length > 15) {
    errors.phone = "Enter a valid phone number, including the country code if needed";
  }
  if (request.email && (request.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.email))) {
    errors.email = "Enter a valid email address or leave this field empty.";
  }
  if (!request.requirements) errors.requirements = "Add the product or specifications you need.";
  else if (request.requirements.length > 3000) errors.requirements = "Use 3,000 characters or fewer for product requirements.";
  const imageError = validateQuoteImages(attachments);
  if (imageError) errors.attachment = imageError;
  return errors;
}

export function formatQuoteFileSize(bytes) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.ceil(bytes / 1024))} KB`;
}
