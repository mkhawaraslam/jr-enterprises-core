import { BusinessError } from "./server";
import { validateBusinessLayout } from "../../utils/businessLayout";

export const layoutColumns = "id,business_id,version,format_path,format_hash,definition,created_at";
export function layoutDatabaseError(error) {
  if (error?.message === "invalid_document_layout" || error?.code === "23514" && /definition|reference|layout_version/.test(error.message || "")) return new BusinessError(503, "Reference layout setup is incomplete. Apply the document-layout migrations through 202610120002_brand_letterhead.sql to this Supabase project.");
  if (["42P01", "42703", "42883", "PGRST202", "PGRST205"].includes(error?.code)) return new BusinessError(503, "Document layout setup is incomplete. Apply 202610110001_business_document_layouts.sql to this Supabase project.");
  if (["business_changed", "document_layout_changed"].includes(error?.message)) return new BusinessError(409, "The business or format changed. Reopen its document layout before approving.");
  return new BusinessError(503, "Document layouts are temporarily unavailable. Please try again.");
}

export async function currentBusinessLayout(client, business, hash) {
  const result = await client.from("business_document_layouts").select(layoutColumns).eq("business_id", business.id)
    .eq("format_path", business.billing_format.path).eq("format_hash", hash).order("version", { ascending: false }).limit(1).maybeSingle();
  if (result.error) throw layoutDatabaseError(result.error);
  if (result.data && !validateBusinessLayout(result.data.definition)) throw new BusinessError(503, "The saved document layout is not supported by this deployment.");
  return result.data;
}
