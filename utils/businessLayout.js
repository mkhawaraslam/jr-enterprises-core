// This bounded, data-only definition is shared by the editor and PDF renderer.
export const defaultBusinessLayout = {
  schema: 1, header: "split", titleAlign: "center", titleSize: 26,
  margin: 38, logoWidth: 115, fontSize: 10, recipientSide: "right",
  tableHeader: "filled", tableBorders: "horizontal", rows: "striped",
  density: "normal", notes: "columns", signatureSide: "left",
  footer: "", pageNumbers: true,
};

export const supplierReferenceLayout = {
  schema: 2, reference: "supplier-grid-v1", margin: 26, logoWidth: 90,
  titleSize: 20, fontSize: 10, density: "normal",
  footer: "Thank you for your inquiry!", pageNumbers: true,
};

export const letterheadReferenceLayout = {
  schema: 2, reference: "letterhead-grid-v1", margin: 26, logoWidth: 100,
  titleSize: 22, fontSize: 9, density: "normal",
  footer: "", pageNumbers: true,
};

export const jrBusinessWebsite = "www.jrenterprisespk.com";
const websitePattern = /^(https?:\/\/)?(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?:\/[^\s]*)?$/i;

export function validateLetterheadWebsite(value) {
  return typeof value === "string" && value.length <= 100 && !/[\x00-\x1f\x7f]/.test(value) && (value === "" || websitePattern.test(value));
}

// Keep previously approved optional headers readable after removing their editor controls.
function validateLetterhead(value) {
  return value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 2
    && Object.keys(value).every((key) => ["namePosition", "website"].includes(key))
    && ["below-logo", "beside-logo"].includes(value.namePosition) && validateLetterheadWebsite(value.website);
}

const choices = {
  header: ["split", "centered", "compact"], titleAlign: ["left", "center", "right"],
  recipientSide: ["left", "right"], tableHeader: ["filled", "line"],
  tableBorders: ["horizontal", "grid"], rows: ["plain", "striped"],
  density: ["compact", "normal", "spacious"], notes: ["columns", "stacked"],
  signatureSide: ["left", "right"],
};
const ranges = { titleSize: [18, 32], margin: [28, 56], logoWidth: [70, 170], fontSize: [9, 12] };

export function validateBusinessLayout(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (value.schema === 2) return Object.keys(value).length === Object.keys(supplierReferenceLayout).length + (Object.prototype.hasOwnProperty.call(value, "letterhead") ? 1 : 0)
    && Object.keys(value).every((key) => Object.prototype.hasOwnProperty.call(supplierReferenceLayout, key) || key === "letterhead")
    && (!Object.prototype.hasOwnProperty.call(value, "letterhead") || value.reference === "letterhead-grid-v1" && validateLetterhead(value.letterhead))
    && ["supplier-grid-v1", "letterhead-grid-v1"].includes(value.reference) && choices.density.includes(value.density)
    && Object.entries({ margin: [26, 40], logoWidth: [70, 110], titleSize: [18, 24], fontSize: [9, 12] })
      .every(([key, [min, max]]) => Number.isInteger(value[key]) && value[key] >= min && value[key] <= max)
    && typeof value.footer === "string" && value.footer.length <= 180 && !/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value.footer)
    && typeof value.pageNumbers === "boolean";
  if (Object.keys(value).length !== Object.keys(defaultBusinessLayout).length || Object.keys(value).some((key) => !Object.prototype.hasOwnProperty.call(defaultBusinessLayout, key))) return false;
  return value.schema === 1 && Object.entries(choices).every(([key, options]) => options.includes(value[key]))
    && Object.entries(ranges).every(([key, [min, max]]) => Number.isInteger(value[key]) && value[key] >= min && value[key] <= max)
    && typeof value.footer === "string" && value.footer.length <= 180 && !/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value.footer)
    && typeof value.pageNumbers === "boolean";
}

export function layoutPreviewDocument(business, definition, kind, accent) {
  const priced = kind !== "challan";
  return {
    business_id: business.id, business_snapshot: { ...business, document_layout: { definition } },
    customer_snapshot: { name: "Demo customer", company_name: "Sample Industries (demo)", phone: "0300 0000000", email: "demo@example.com", address: "Sample delivery address, Pakistan" },
    layout_id: "custom-mapped", layout_version: definition.schema === 2 ? 2 : 1, accent,
    reference: "3525",
    ...(kind === "invoice" ? { customer_reference: "PO-2026-001" } : {}),
    date: "2026-01-15", valid_until: "2026-01-30", due_date: "2026-01-30",
    subject: "Sample industrial supply (preview only)", notes: "Demo data. This is not an issued document.",
    total: priced ? 27500 : null, quantity_total: 7,
    delivery_address: "Sample delivery address, Pakistan",
    items: [{ description: "Pneumatic cylinder - sample", unit: "NOS", quantity: 3, ...(priced ? { price: 6500, amount: 19500 } : {}) },
      { description: "Pneumatic tubing - sample", unit: "MTR", quantity: 4, ...(priced ? { price: 2000, amount: 8000 } : {}) }],
  };
}
