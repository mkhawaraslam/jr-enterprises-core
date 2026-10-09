import { businessHandler } from "../../../../lib/businesses/api";
import { listBusinesses, saveBusiness } from "../../../../lib/businesses/server";

export const config = { api: { bodyParser: { sizeLimit: "4.2mb" } }, maxDuration: 60 };
export default businessHandler({ GET: (client, req) => listBusinesses(client, req.query), POST: (client, req, user) => saveBusiness(client, null, req.body, user) });
