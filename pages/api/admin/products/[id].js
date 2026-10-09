import { productHandler } from "../../../../lib/products/api";
import { deleteProduct, readProduct, saveProduct } from "../../../../lib/products/server";

export const config = { api: { bodyParser: { sizeLimit: "32kb" } } };
export default productHandler({
  GET: (client, req) => readProduct(client, req.query.id),
  PATCH: (client, req, user) => saveProduct(client, req.query.id, req.body, user),
  DELETE: (client, req) => deleteProduct(client, req.query.id, req.body),
});
