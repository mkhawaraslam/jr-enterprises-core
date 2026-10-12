import { letterheadReferenceLayout, supplierReferenceLayout } from "../../utils/businessLayout";

// A mapping belongs to the inspected file, never to a business name or filename.
export const supplierReferenceHash = "98f526fe0afcae70f54166dbafc6dd617ed9f1da61350e0b60013fa45baf951a";
export const letterheadReferenceHash = "e783a62de36c63dfbb888c1967fadeaa6874e151671d821c5fbc3b5551c37e62";

export function referenceLayout(hash) {
  if (hash === supplierReferenceHash) return { name: "Ruled supplier reference", definition: supplierReferenceLayout };
  if (hash === letterheadReferenceHash) return { name: "Letterhead and connected-grid reference", definition: letterheadReferenceLayout };
  return null;
}

export function layoutMatchesReference(definition, hash) {
  const mapped = referenceLayout(hash);
  return definition.schema === 2 ? mapped?.definition.reference === definition.reference : !mapped;
}
