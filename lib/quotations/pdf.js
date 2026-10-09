import pdfmake from "pdfmake";
import fontFiles from "pdfmake/build/vfs_fonts";
import { quotationDocumentDefinition } from "../../utils/quotationDocument";
import { quotationPdfImages } from "./assets";

// Bundle fonts in memory so serverless rendering needs no runtime font-file access.
for (const [name, bytes] of Object.entries(fontFiles)) pdfmake.virtualfs.writeFileSync(name, Buffer.from(bytes, "base64"));
pdfmake.addFonts({ Roboto: { normal: "Roboto-Regular.ttf", bold: "Roboto-Medium.ttf", italics: "Roboto-Italic.ttf", bolditalics: "Roboto-MediumItalic.ttf" } });
pdfmake.setUrlAccessPolicy(() => false);
pdfmake.setLocalAccessPolicy(() => false);

export async function renderQuotationPdf(quote, images) {
  return pdfmake.createPdf(quotationDocumentDefinition(quote, images)).getBuffer();
}

export async function quotationPdf(client, quote) {
  return renderQuotationPdf(quote, await quotationPdfImages(client, quote));
}
