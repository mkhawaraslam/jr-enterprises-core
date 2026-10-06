export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  try {
    const parsed = new URL(url);
    if (!["https:", "http:"].includes(parsed.protocol) || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) return null;
    if (parsed.protocol === "http:" && !["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname)) return null;
    if (anonKey.startsWith("sb_secret_")) return null;
    return { url: parsed.origin, anonKey };
  } catch {
    return null;
  }
}

export function supabaseCookieOptions() {
  return { path: "/", sameSite: "lax", secure: process.env.NODE_ENV === "production" };
}
