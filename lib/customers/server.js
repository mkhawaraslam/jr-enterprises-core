import { randomUUID } from "node:crypto";
import { normalizeCustomer, validateCustomer } from "../../utils/adminCustomer";

export const customerColumns = "id,name,company_name,email,phone,address,revision,created_at,updated_at";
const unavailable = "Customer management is temporarily unavailable. Please try again.";
const customerId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class CustomerError extends Error {
  constructor(status, message, fields) { super(message); this.status = status; this.fields = fields; }
}

function databaseError(error) {
  if (error?.message === "customer_not_found") return new CustomerError(404, "Customer not found.");
  if (error?.message === "customer_changed") return new CustomerError(409, "This customer changed while you were editing. Reload the customer before continuing.");
  if (error?.code === "23503") return new CustomerError(409, "This customer is linked to other records and cannot be deleted.");
  return new CustomerError(503, unavailable);
}

function validateId(id) {
  if (typeof id !== "string" || !customerId.test(id)) throw new CustomerError(404, "Customer not found.");
}

function revision(value) {
  if (!Number.isSafeInteger(value) || value < 1) throw new CustomerError(422, "Reload the customer before continuing.");
  return value;
}

export async function readCustomer(client, id) {
  validateId(id);
  const result = await client.from("customers").select(customerColumns).eq("id", id).maybeSingle();
  if (result.error) throw databaseError(result.error);
  if (!result.data) throw new CustomerError(404, "Customer not found.");
  return result.data;
}

export async function listCustomers(client, query) {
  const page = Number(query.page || 1);
  if (!Number.isSafeInteger(page) || page < 1 || page > 1000000 || (query.search != null && typeof query.search !== "string")) throw new CustomerError(400, "Invalid search or page.");
  const result = await client.rpc("list_customers", { p_search: (query.search || "").trim().slice(0, 100), p_page: page });
  if (result.error || !Array.isArray(result.data?.items) || !Number.isSafeInteger(result.data?.count) || result.data.count < 0) throw databaseError(result.error);
  return result.data;
}

export async function saveCustomer(client, id, body, user) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new CustomerError(422, "Please check the customer details.");
  const fields = validateCustomer(body);
  if (Object.keys(fields).length) throw new CustomerError(422, "Please check the highlighted fields.", fields);
  if (id) validateId(id);
  const expected = id ? revision(body.revision) : null;
  const customer = id || randomUUID();
  const saved = await client.rpc("save_customer", { p_id: customer, p_values: normalizeCustomer(body), p_revision: expected, p_actor: user.id });
  if (saved.error || saved.data !== customer) throw databaseError(saved.error);
  return { id: customer };
}

export async function deleteCustomer(client, id, body) {
  validateId(id);
  if (body?.confirmation !== "delete-customer") throw new CustomerError(422, "Confirm deletion before continuing.");
  const deleted = await client.rpc("delete_customer", { p_id: id, p_revision: revision(body.revision) });
  if (deleted.error || deleted.data !== true) throw databaseError(deleted.error);
  return { id, deleted: true };
}
