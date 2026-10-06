import { useCallback, useEffect, useRef, useState } from "react";
import { adminQuoteRequest } from "../../lib/quotes/adminBrowser";

export default function useQuoteRequestCounts() {
  const [state, setState] = useState({ total: null, unreviewed: null, revision: 0, error: "" });
  const refreshRef = useRef(() => {});
  const refresh = useCallback(() => refreshRef.current(), []);
  useEffect(() => {
    let active = true;
    let controller;
    let timer;
    const read = async () => {
      clearTimeout(timer);
      controller?.abort();
      if (document.visibilityState === "hidden") return;
      const current = new AbortController();
      controller = current;
      try {
        const data = await adminQuoteRequest("/api/admin/quote-requests/counts", { signal: current.signal });
        if (!Number.isSafeInteger(data.total) || data.total < 0 || !Number.isSafeInteger(data.unreviewed) || data.unreviewed < 0 || data.unreviewed > data.total) throw new Error("Request counts are unavailable.");
        if (active && !current.signal.aborted) setState((previous) => ({ ...data, revision: previous.revision + 1, error: "" }));
      } catch (error) {
        if (active && !current.signal.aborted) setState((previous) => ({ ...previous, total: null, unreviewed: null, error: error.message }));
      } finally {
        if (active && controller === current && !current.signal.aborted) timer = setTimeout(read, 30000);
      }
    };
    refreshRef.current = read;
    read();
    window.addEventListener("focus", read);
    window.addEventListener("quote-requests-changed", read);
    document.addEventListener("visibilitychange", read);
    return () => {
      active = false; clearTimeout(timer); controller?.abort(); refreshRef.current = () => {};
      window.removeEventListener("focus", read);
      window.removeEventListener("quote-requests-changed", read);
      document.removeEventListener("visibilitychange", read);
    };
  }, []);
  return { ...state, refresh };
}
