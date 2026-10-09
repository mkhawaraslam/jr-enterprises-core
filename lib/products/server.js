import { randomUUID } from "node:crypto";
import { normalizeProduct, validateProduct } from "../../utils/adminProduct";

export const productColumns = "id,name,price,revision,created_at,updated_at";
const unavailable = "Product management is temporarily unavailable. Please try again.";
const productId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class ProductError extends Error {
  constructor(status, message, fields) { super(message); this.status = status; this.fields = fields; }
}

function databaseError(error) {
  if (error?.message === "product_not_found") return new ProductError(404, "Product not found.");
  if (error?.message === "product_changed") return new ProductError(409, "This product changed while you were editing. Reload the product before continuing.");
  if (error?.code === "23503") return new ProductError(409, "This product is linked to other records and cannot be deleted.");
  return new ProductError(503, unavailable);
}

function validateId(id) {
  if (typeof id !== "string" || !productId.test(id)) throw new ProductError(404, "Product not found.");
  return id.toLowerCase();
}

function revision(value) {
  if (!Number.isSafeInteger(value) || value < 1) throw new ProductError(422, "Reload the product before continuing.");
  return value;
}

export async function readProduct(client, id) {
  const result = await client.from("products").select(productColumns).eq("id", validateId(id)).maybeSingle();
  if (result.error) throw databaseError(result.error);
  if (!result.data) throw new ProductError(404, "Product not found.");
  return result.data;
}

export async function listProducts(client, query) {
  const page = Number(query.page || 1);
  if (!Number.isSafeInteger(page) || page < 1 || page > 1000000 || (query.search != null && typeof query.search !== "string")) throw new ProductError(400, "Invalid search or page.");
  const result = await client.rpc("list_products", { p_search: (query.search || "").trim().slice(0, 100), p_page: page });
  if (result.error || !Array.isArray(result.data?.items) || !Number.isSafeInteger(result.data?.count) || result.data.count < 0) throw databaseError(result.error);
  return result.data;
}

export async function saveProduct(client, id, body, user) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new ProductError(422, "Please check the product details.");
  const fields = validateProduct(body);
  if (Object.keys(fields).length) throw new ProductError(422, "Please check the highlighted fields.", fields);
  const product = id ? validateId(id) : randomUUID();
  const expected = id ? revision(body.revision) : null;
  const values = normalizeProduct(body);
  const saved = await client.rpc("save_product", { p_id: product, p_values: { name: values.name, price: Number(values.price) }, p_revision: expected, p_actor: user.id });
  if (saved.error || saved.data !== product) throw databaseError(saved.error);
  return { id: product };
}

export async function deleteProduct(client, id, body) {
  const product = validateId(id);
  if (body?.confirmation !== "delete-product") throw new ProductError(422, "Confirm deletion before continuing.");
  const deleted = await client.rpc("delete_product", { p_id: product, p_revision: revision(body.revision) });
  if (deleted.error || deleted.data !== true) throw databaseError(deleted.error);
  return { id: product, deleted: true };
}
