import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "./config";

export function createSupabaseServiceClient() {
  if (typeof window !== "undefined") throw new Error("Server-only Supabase client");
  const config = getSupabaseConfig();
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!config || !key) return null;
  if (!key.startsWith("sb_secret_")) {
    try {
      if (JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString()).role !== "service_role") return null;
    } catch { return null; }
  }
  return createClient(config.url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}
