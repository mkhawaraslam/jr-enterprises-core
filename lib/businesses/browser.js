export async function businessRequest(url, { method = "GET", body, signal } = {}) {
  const response = await fetch(url, { method, signal, credentials: "same-origin", cache: "no-store", ...(body !== undefined ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) });
  if (response.status === 401) { window.location.replace("/admin/login"); throw new Error("Your session has ended. Please sign in again."); }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(result.error || "Unable to manage businesses. Please try again."); error.status = response.status; error.fields = result.fields || {}; throw error; }
  return result;
}

export function encodeBusinessFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, type: file.type, size: file.size, content: String(reader.result).split(",")[1] });
    reader.onerror = () => reject(new Error("The file could not be read. Please select it again."));
    reader.onabort = reader.onerror;
    reader.readAsDataURL(file);
  });
}

export const encodeBusinessImage = encodeBusinessFile;
