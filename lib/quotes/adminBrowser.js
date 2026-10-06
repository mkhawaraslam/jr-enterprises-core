export async function adminQuoteRequest(url, { method = "GET", body, signal } = {}) {
  const response = await fetch(url, {
    method, signal, credentials: "same-origin", cache: "no-store",
    ...(body !== undefined ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
  });
  if (response.status === 401) { window.location.replace("/admin/login"); throw new Error("Your session has ended. Please sign in again."); }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error || "Unable to load requests. Please try again.");
    error.status = response.status;
    throw error;
  }
  return result;
}

export function notifyQuoteRequestsChanged() {
  window.dispatchEvent(new Event("quote-requests-changed"));
}
