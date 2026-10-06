import { QUOTE_PHOTO_BUCKET } from "../../utils/quoteRequest";

export function isExistingQuotePhoto(error) {
  if (!error) return false;
  if (String(error.statusCode) === "409") return true;
  if (String(error.statusCode) !== "400") return false;
  return ["Duplicate", "ResourceAlreadyExists", "KeyAlreadyExists", "already_exists"].includes(error.code) ||
    /^(?:The resource already exists|Asset Already Exists)\.?$/i.test(error.message || "");
}

export async function quoteApiRequest(url, body) {
  const response = await fetch(url, {
    method: "POST", headers: { "Content-Type": "application/json" },
    credentials: "same-origin", body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || "Unable to submit your request. Please try again.");
    error.status = response.status;
    error.fields = data.fields;
    throw error;
  }
  return data;
}

export async function uploadQuotePhotos(reservation, photos, uploadedPaths) {
  if (!photos.length) return;
  const { getSupabaseBrowserClient } = await import("../supabase/browser");
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error("Photo uploads are temporarily unavailable. Please try again later.");
  for (let index = 0; index < photos.length; index += 1) {
    const upload = reservation.uploads[index];
    if (uploadedPaths.has(upload.path)) continue;
    const { error } = await client.storage.from(QUOTE_PHOTO_BUCKET).uploadToSignedUrl(upload.path, upload.token, photos[index], { contentType: photos[index].type });
    // An interrupted response may still have stored the file; the server verifies it.
    if (error && !isExistingQuotePhoto(error)) throw new Error("A photo could not be uploaded. Please retry your submission.");
    uploadedPaths.add(upload.path);
  }
}
