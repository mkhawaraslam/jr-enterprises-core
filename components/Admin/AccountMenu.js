import { useEffect, useRef, useState } from "react";
import { ChevronDown, LoaderCircle, LogOut } from "lucide-react";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";

export default function AccountMenu({ user }) {
  const email = user?.email || "";
  const signingOutRef = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) return;
    const { data: { subscription } } = client.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" && !signingOutRef.current) window.location.replace("/admin/login");
    });
    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    if (signingOutRef.current) return;
    signingOutRef.current = true;
    setPending(true);
    setError("");
    try {
      const client = getSupabaseBrowserClient();
      if (!client) throw new Error("Auth unavailable");
      const { error: signOutError } = await client.auth.signOut({ scope: "local" });
      if (signOutError) throw signOutError;
      // Leave the client-side workspace behind after clearing its session.
      window.location.replace("/admin/login");
    } catch {
      signingOutRef.current = false;
      setError("Unable to sign out. Please try again.");
      setPending(false);
    }
  };

  return (
    <details className="relative">
      <summary aria-label="Account menu" title="Account menu" className="flex cursor-pointer list-none items-center gap-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-details-marker]:hidden">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-[11px] font-medium text-zinc-700" aria-hidden="true">{email.slice(0, 2).toUpperCase() || "JR"}</span>
        <ChevronDown className="hidden h-3 w-3 text-zinc-400 sm:block" aria-hidden="true" />
      </summary>
      <div className="absolute right-0 top-12 z-30 w-64 max-w-[calc(100vw-2rem)] rounded-lg border border-zinc-200 bg-white-500 p-4 shadow-lg">
        <div className="text-[11px] text-zinc-500">Signed in as</div>
        <div className="mt-1 break-all text-xs font-medium text-zinc-800">{email}</div>
        {user?.role && <span className="mt-2 inline-block rounded bg-primary-light px-2 py-1 text-[10px] capitalize text-primary">{user.role}</span>}
        <button type="button" disabled={pending} onClick={signOut} aria-busy={pending} className="mt-4 flex min-h-[2.5rem] w-full items-center gap-2 rounded border-t border-zinc-100 pt-3 text-left text-xs text-zinc-600 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-wait disabled:opacity-70">
          {pending ? <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <LogOut className="h-4 w-4" aria-hidden="true" />}
          {pending ? "Signing out..." : "Log out"}
        </button>
        {error && <p role="alert" className="mt-3 text-xs leading-relaxed text-primary">{error}</p>}
      </div>
    </details>
  );
}
