import { createHash } from "node:crypto";
import sharp from "sharp";
import { BUSINESS_ASSET_BUCKET, BUSINESS_IMAGE_LIMIT } from "../../utils/adminBusiness";
import { isBusinessAssetPath } from "../businesses/server";
import { resolveQuotationLayout } from "../../utils/quotationLayouts";

export async function downloadQuotationAsset(client, businessId, asset) {
  if (!isBusinessAssetPath(asset?.path, businessId)) throw new Error("Invalid business asset.");
  const result = await client.storage.from(BUSINESS_ASSET_BUCKET).download(asset.path);
  if (result.error || !result.data || result.data.size > BUSINESS_IMAGE_LIMIT) throw new Error("Business file unavailable.");
  return Buffer.from(await result.data.arrayBuffer());
}

export async function businessQuotationLayout(client, business) {
  const hash = business.billing_mode === "custom" ? createHash("sha256").update(await downloadQuotationAsset(client, business.id, business.billing_format)).digest("hex") : null;
  return { layout: resolveQuotationLayout(business, hash), formatHash: hash };
}

export async function quotationLogoTheme(bytes) {
  const { data } = await sharp(bytes, { limitInputPixels: 40000000 }).rotate().resize(96, 96, { fit: "inside" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const bins = new Map();
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = data.subarray(i, i + 4);
    const maximum = Math.max(r, g, b); const minimum = Math.min(r, g, b);
    if (a < 160 || maximum - minimum < 45 || maximum > 245 && minimum > 210 || maximum < 45) continue;
    const key = [r, g, b].map((value) => Math.round(value / 24)).join(",");
    const bin = bins.get(key) || { count: 0, r: 0, g: 0, b: 0 };
    bin.count++; bin.r += r; bin.g += g; bin.b += b; bins.set(key, bin);
  }
  const chosen = [...bins.values()].sort((a, b) => b.count - a.count)[0];
  const rgb = chosen ? [chosen.r, chosen.g, chosen.b].map((value) => Math.round(value / chosen.count)) : [196, 33, 42];
  // Darken unusually pale logos so white document headings keep readable contrast.
  const contrast = (values) => {
    const linear = values.map((value) => { const c = value / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
    return 1.05 / (linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722 + 0.05);
  };
  while (contrast(rgb) < 4.5) for (let i = 0; i < rgb.length; i++) rgb[i] = Math.floor(rgb[i] * 0.94);
  return "#" + rgb.map((value) => value.toString(16).padStart(2, "0")).join("");
}

export async function quotationPdfImages(client, quote) {
  const assets = {};
  for (const slot of ["logo", "signature"]) {
    const bytes = await downloadQuotationAsset(client, quote.business_id, quote.business_snapshot[slot]);
    const image = await sharp(bytes, { limitInputPixels: 40000000 }).rotate().trim({ threshold: 16 }).resize(slot === "logo" ? 500 : 450, slot === "logo" ? 200 : 160, { fit: "inside", withoutEnlargement: true }).png().toBuffer();
    assets[slot] = "data:image/png;base64," + image.toString("base64");
  }
  return assets;
}
