import { businessHandler } from "../../../../../../lib/businesses/api";
import { approveBusinessLayout, readLayoutEditor } from "../../../../../../lib/businesses/layouts";

export default businessHandler({
  GET: (client, req) => readLayoutEditor(client, req.query.id),
  POST: (client, req, user) => approveBusinessLayout(client, req.query.id, req.body, user),
});
export const config = { api: { bodyParser: { sizeLimit: "16kb" } } };
