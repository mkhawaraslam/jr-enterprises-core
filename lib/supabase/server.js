import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import { getSupabaseConfig, supabaseCookieOptions } from "./config";
import { getWorkspaceRole } from "../../utils/adminAuth";

export function setAdminResponseHeaders(res) {
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
}

export function createSupabaseServerClient(req, res) {
  const config = getSupabaseConfig();
  if (!config) return null;
  const cookies = new Map(parseCookieHeader(req.headers.cookie || "").map(({ name, value }) => [name, value]));
  const cookieWrites = new Map();
  const previousCookies = res.getHeader("Set-Cookie");
  const existingCookies = previousCookies ? (Array.isArray(previousCookies) ? previousCookies : [String(previousCookies)]) : [];

  return createServerClient(config.url, config.anonKey, {
    cookieOptions: supabaseCookieOptions(),
    cookies: {
      getAll: () => Array.from(cookies, ([name, value]) => ({ name, value })),
      setAll(cookiesToSet, headers = {}) {
        for (const { name, value, options } of cookiesToSet) {
          cookies.set(name, value);
          cookieWrites.set(name, serializeCookieHeader(name, value, options));
        }
        res.setHeader("Set-Cookie", [...existingCookies, ...cookieWrites.values()]);
        Object.entries(headers).forEach(([name, value]) => res.setHeader(name, value));
        setAdminResponseHeaders(res);
      },
    },
  });
}

export async function getWorkspaceAccess(context, allowedRoles = null) {
  setAdminResponseHeaders(context.res);
  try {
    const client = createSupabaseServerClient(context.req, context.res);
    if (!client) return { status: "unavailable" };
    // Always validate with Auth; cookie contents and user_metadata are not authorization.
    const { data, error } = await client.auth.getUser();
    if (error) return { status: error.status >= 500 || !error.status ? "unavailable" : "unauthenticated" };
    if (!data?.user?.id) return { status: "unauthenticated" };
    const role = getWorkspaceRole(data.user);
    if (allowedRoles !== null && (!role || !allowedRoles.includes(role))) return { status: "forbidden" };
    return {
      status: "authorized",
      user: { id: data.user.id, email: data.user.email || "", role },
    };
  } catch {
    return { status: "unavailable" };
  }
}

export function workspaceRedirect(status) {
  return {
    redirect: {
      destination: status === "forbidden" ? "/admin/login?error=access_denied" : "/admin/login",
      permanent: false,
    },
  };
}
