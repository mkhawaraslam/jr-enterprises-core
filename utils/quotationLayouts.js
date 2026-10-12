import { findBusinessTemplate } from "./businessTemplates";

export function resolveQuotationLayout(business) {
  // Custom mappings are approved, versioned database records, not a file whitelist.
  if (business.billing_mode === "custom") return null;
  const template = findBusinessTemplate(business.template_id, business.template_version);
  return template ? { id: template.id, version: template.version, name: template.name } : null;
}

export function isQuotationLayout(id, version) {
  return version === 1 && ["industrial", "ledger", "minimal", "reference-classic", "custom-mapped"].includes(id)
    || id === "custom-mapped" && version === 2;
}
