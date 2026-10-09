import { businessHandler } from "../../../../lib/businesses/api";
import { deleteBusiness, readBusiness, saveBusiness, signBusinessAssets } from "../../../../lib/businesses/server";

export const config = { api: { bodyParser: { sizeLimit: "4.2mb" } }, maxDuration: 60 };
export default businessHandler({
  GET: async (client, req) => (await signBusinessAssets(client, [await readBusiness(client, req.query.id)]))[0],
  PATCH: (client, req, user) => saveBusiness(client, req.query.id, req.body, user),
  DELETE: (client, req) => deleteBusiness(client, req.query.id, req.body),
});
