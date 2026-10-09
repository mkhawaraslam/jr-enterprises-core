import { customerHandler } from "../../../../lib/customers/api";
import { listCustomers, saveCustomer } from "../../../../lib/customers/server";

export const config = { api: { bodyParser: { sizeLimit: "32kb" } } };
export default customerHandler({ GET: (client, req) => listCustomers(client, req.query), POST: (client, req, user) => saveCustomer(client, null, req.body, user) });
