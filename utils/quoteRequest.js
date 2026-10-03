export const MAX_QUOTE_IMAGE_SIZE = 5 * 1024 * 1024;
export const QUOTE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const emptyQuoteRequest = {
  fullName: "",
  company: "",
  phone: "",
  email: "",
  requirements: "",
};

export function validateQuoteImage(file) {
  if (!file) return "";
  if (!QUOTE_IMAGE_TYPES.includes(file.type)) return "Choose a JPG, PNG, or WebP photo.";
  if (!file.size) return "This photo is empty. Please choose another file.";
  if (file.size > MAX_QUOTE_IMAGE_SIZE) return "The photo must be 5 MB or smaller.";
  return "";
}

export function createQuoteRequest(values, attachment = null) {
  return {
    ...Object.fromEntries(Object.keys(emptyQuoteRequest).map((key) => [key, values[key].trim()])),
    attachment,
  };
}

export function validateQuoteRequest(values, attachment = null) {
  const request = createQuoteRequest(values, attachment);
  const errors = {};
  if (!request.fullName) errors.fullName = "Enter your full name.";
  const phoneDigits = request.phone.replace(/\D/g, "");
  if (!request.phone) {
    errors.phone = "Enter a phone number so we can contact you.";
  } else if (!/^\+?[\d\s().-]+$/.test(request.phone) || phoneDigits.length < 7 || phoneDigits.length > 15) {
    errors.phone = "Enter a valid phone number, including the country code if needed.";
  }
  if (request.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.email)) {
    errors.email = "Enter a valid email address or leave this field empty.";
  }
  if (!request.requirements) errors.requirements = "Add the product or specifications you need.";
  const imageError = validateQuoteImage(attachment);
  if (imageError) errors.attachment = imageError;
  return errors;
}
