import { layoutFileHandler } from "../../../../../../lib/businesses/layoutApi";
import { previewBusinessLayout } from "../../../../../../lib/businesses/layouts";

export default layoutFileHandler("POST", async (client, req) => ({
  bytes: await previewBusinessLayout(client, req.query.id, req.body), type: "application/pdf", name: "layout-preview-not-issued.pdf",
}));
export const config = { api: { bodyParser: { sizeLimit: "16kb" } } };
