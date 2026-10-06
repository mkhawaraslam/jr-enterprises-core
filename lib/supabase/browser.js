import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig, supabaseCookieOptions } from "./config";

let browserClient;

export function getSupabaseBrowserClient() {
  const config = getSupabaseConfig();
  if (!config || typeof window === "undefined") return null;
  if (!browserClient) {
    browserClient = createBrowserClient(config.url, config.anonKey, {
      cookieOptions: supabaseCookieOptions(),
      auth: { detectSessionInUrl: false },
    });
  }
  return browserClient;
}
