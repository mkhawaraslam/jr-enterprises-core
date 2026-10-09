import { customerHandler } from "../../../../lib/customers/api";
import { deleteCustomer, readCustomer, saveCustomer } from "../../../../lib/customers/server";

export const config = { api: { bodyParser: { sizeLimit: "32kb" } } };
export default customerHandler({
  GET: (client, req) => readCustomer(client, req.query.id),
  PATCH: (client, req, user) => saveCustomer(client, req.query.id, req.body, user),
  DELETE: (client, req) => deleteCustomer(client, req.query.id, req.body),
});
