// Published template IDs and versions stay unchanged; add a new version for a redesign.
export const businessTemplates = [
  { id: "industrial", version: 1, name: "Industrial", accent: "primary" },
  { id: "ledger", version: 1, name: "Ledger", accent: "emerald" },
  { id: "minimal", version: 1, name: "Minimal", accent: "zinc" },
];

export const documentTypes = [
  { id: "quotation", name: "Quotation", reference: "QT-DEMO-001", recipient: "Quote to" },
  { id: "invoice", name: "Invoice", reference: "INV-DEMO-001", recipient: "Bill to" },
  { id: "delivery-challan", name: "Delivery challan", reference: "DC-DEMO-001", recipient: "Deliver to" },
];

export const defaultBillingPreference = { billing_mode: "custom", template_id: "industrial", template_version: 1 };

export function normalizeBillingPreference(values) {
  return {
    billing_mode: values?.billing_mode ?? defaultBillingPreference.billing_mode,
    template_id: values?.template_id ?? defaultBillingPreference.template_id,
    template_version: values?.template_version ?? defaultBillingPreference.template_version,
  };
}

export function findBusinessTemplate(id, version) {
  return businessTemplates.find((template) => template.id === id && template.version === version);
}
