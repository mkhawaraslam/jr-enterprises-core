import { normalizeQuotation, validateQuotation, validQuotationDate } from "./adminQuotation";

export const salesDocumentTypes = {
  invoice: { name: "Invoice", singular: "invoice", plural: "Invoices", module: "invoices", route: "/admin/invoices", priced: true, title: "INVOICE", prefix: "INV" },
  challan: { name: "Delivery challan", singular: "delivery challan", plural: "Delivery challans", module: "delivery", route: "/admin/delivery-challans", priced: false, title: "DELIVERY CHALLAN", prefix: "DC" },
};
export const salesDocumentType = (kind) => typeof kind === "string" && Object.prototype.hasOwnProperty.call(salesDocumentTypes, kind) ? salesDocumentTypes[kind] : null;
export const documentApi = (kind) => "/api/admin/sales-documents/" + kind;
const text = (value) => typeof value === "string" ? value.trim() : "";

export function normalizeSalesDocument(kind, values) {
  const { valid_until, ...document } = normalizeQuotation(values);
  return {
    ...document,
    due_date: kind === "invoice" ? text(values?.due_date) : "",
    customer_reference: text(values?.customer_reference),
    delivery_address: kind === "challan" ? text(values?.delivery_address) : "",
    items: document.items.map(({ price, ...item }) => kind === "invoice" ? { ...item, price } : item),
  };
}

export function validateSalesDocument(kind, values) {
  if (!salesDocumentType(kind)) return { kind: "Choose a valid document type." };
  const document = normalizeSalesDocument(kind, values);
  const errors = validateQuotation(document, { validity: false, pricing: kind === "invoice" });
  if (document.due_date && (!validQuotationDate(document.due_date) || document.due_date < document.date)) errors.due_date = "The due date must be on or after the invoice date.";
  if (document.customer_reference.length > 100) errors.customer_reference = "Use 100 characters or fewer.";
  if (document.delivery_address.length > 2000) errors.delivery_address = "Use 2,000 characters or fewer.";
  return errors;
}

export function documentQuantity(items) {
  return items.reduce((quantity, item) => quantity + Number(item.quantity || 0), 0);
}
