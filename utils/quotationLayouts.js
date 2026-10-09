import { findBusinessTemplate } from "./businessTemplates";

// A custom reference is matched by content, not by a business name or mutable URL.
export const customQuotationFormats = {
  "9c7f10a3d1c4d51a9104af6afc29c5f5fd09eb4010a24436e66b73a31107d842": { id: "reference-classic", version: 1, name: "Classic reference" },
};

export function resolveQuotationLayout(business, formatHash) {
  if (business.billing_mode === "custom") return customQuotationFormats[formatHash] || null;
  const template = findBusinessTemplate(business.template_id, business.template_version);
  return template ? { id: template.id, version: template.version, name: template.name } : null;
}

export function isQuotationLayout(id, version) {
  return version === 1 && ["industrial", "ledger", "minimal", "reference-classic"].includes(id);
}
