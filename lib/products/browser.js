export async function productRequest(url, { method = "GET", body, signal } = {}) {
  const response = await fetch(url, { method, signal, credentials: "same-origin", cache: "no-store", ...(body !== undefined ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) });
  if (response.status === 401) { window.location.replace("/admin/login"); throw new Error("Your session has ended. Please sign in again."); }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(result.error || "Unable to manage products. Please try again."); error.status = response.status; error.fields = result.fields || {}; throw error; }
  return result;
}
