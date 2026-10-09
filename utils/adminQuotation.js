import { MAX_PRODUCT_PRICE } from "./adminProduct";

export const QUOTATION_PAGE_SIZE = 12;
export const MAX_QUOTATION_ITEMS = 100;
export const MAX_QUOTATION_TOTAL = 999999999999;
export const isQuotationId = (id) => typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
const integerText = (value) => typeof value === "string" ? value.trim() : typeof value === "number" && Number.isFinite(value) ? String(value) : "";
const text = (value) => typeof value === "string" ? value.trim() : "";

export function quotationToday() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  return ["year", "month", "day"].map((type) => parts.find((part) => part.type === type).value).join("-");
}

export function validQuotationDate(date) {
  return /^20\d{2}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) && new Date(date + "T00:00:00Z").toISOString().slice(0, 10) === date;
}

export function quotationExpiry(date) {
  if (!validQuotationDate(date)) return "";
  return new Date(Date.parse(date + "T00:00:00Z") + 15 * 86400000).toISOString().slice(0, 10);
}

export function normalizeQuotation(values) {
  return {
    business_id: text(values?.business_id).toLowerCase(), business_revision: values?.business_revision,
    customer_id: text(values?.customer_id).toLowerCase(), customer_revision: values?.customer_revision,
    date: text(values?.date), valid_until: text(values?.valid_until), subject: text(values?.subject), notes: text(values?.notes),
    items: Array.isArray(values?.items) ? values.items.map((item) => ({ product_id: text(item?.product_id).toLowerCase(), revision: item?.revision, description: text(item?.description), quantity: integerText(item?.quantity), price: integerText(item?.price) })) : [],
  };
}

export function quotationSubtotal(items) {
  return items.reduce((total, item) => total + Number(item.quantity || 0) * Number(item.price || 0), 0);
}

export function validateQuotation(values) {
  const quote = normalizeQuotation(values);
  const errors = {};
  if (!isQuotationId(quote.business_id) || !Number.isSafeInteger(quote.business_revision) || quote.business_revision < 1) errors.business_id = "Choose a business.";
  if (!isQuotationId(quote.customer_id) || !Number.isSafeInteger(quote.customer_revision) || quote.customer_revision < 1) errors.customer_id = "Choose a customer.";
  if (!validQuotationDate(quote.date)) errors.date = "Enter a valid quotation date.";
  if (!validQuotationDate(quote.valid_until) || quote.valid_until < quote.date) errors.valid_until = "Validity must be on or after the quotation date.";
  if (quote.subject.length > 500) errors.subject = "Use 500 characters or fewer.";
  if (quote.notes.length > 5000) errors.notes = "Use 5,000 characters or fewer.";
  if (!quote.items.length || quote.items.length > MAX_QUOTATION_ITEMS) errors.items = `Add between 1 and ${MAX_QUOTATION_ITEMS} products.`;
  for (const [index, item] of quote.items.entries()) {
    if (!isQuotationId(item.product_id) || !Number.isSafeInteger(item.revision) || item.revision < 1) errors[`items.${index}.product_id`] = "Choose a current product.";
    if (!item.description || item.description.length > 500) errors[`items.${index}.description`] = "Enter a description of 500 characters or fewer.";
    if (!/^\d+$/.test(item.quantity) || Number(item.quantity) < 1 || Number(item.quantity) > 1000000) errors[`items.${index}.quantity`] = "Use a whole-number quantity from 1 to 1,000,000.";
    if (!/^\d+$/.test(item.price) || Number(item.price) > MAX_PRODUCT_PRICE) errors[`items.${index}.price`] = "Use a whole-number price from 0 to 2,147,483,647.";
  }
  const total = quotationSubtotal(quote.items);
  if (!Number.isSafeInteger(total) || total > MAX_QUOTATION_TOTAL) errors.items = "The quotation total exceeds PKR 999,999,999,999.";
  return errors;
}

export function formatQuotationAmount(amount) {
  return "PKR " + new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(amount);
}

export function formatQuotationDate(date) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(date + "T00:00:00Z"));
}
