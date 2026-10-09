import { productHandler } from "../../../../lib/products/api";
import { listProducts, saveProduct } from "../../../../lib/products/server";

export const config = { api: { bodyParser: { sizeLimit: "32kb" } } };
export default productHandler({ GET: (client, req) => listProducts(client, req.query), POST: (client, req, user) => saveProduct(client, null, req.body, user) });
