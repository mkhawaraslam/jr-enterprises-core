import pdfmake from "pdfmake";
import fontFiles from "pdfmake/build/vfs_fonts";
import { quotationDocumentDefinition } from "../../utils/quotationDocument";
import { quotationPdfImages } from "./assets";

// Bundle fonts in memory so serverless rendering needs no runtime font-file access.
for (const [name, bytes] of Object.entries(fontFiles)) pdfmake.virtualfs.writeFileSync(name, Buffer.from(bytes, "base64"));
pdfmake.addFonts({ Roboto: { normal: "Roboto-Regular.ttf", bold: "Roboto-Medium.ttf", italics: "Roboto-Italic.ttf", bolditalics: "Roboto-MediumItalic.ttf" } });
pdfmake.addFonts({ Times: { normal: "Times-Roman", bold: "Times-Bold", italics: "Times-Italic", bolditalics: "Times-BoldItalic" } });
pdfmake.setUrlAccessPolicy(() => false);
// These PDF built-in font names are not file paths; all filesystem paths stay denied.
pdfmake.setLocalAccessPolicy((name) => ["Times-Roman", "Times-Bold", "Times-Italic", "Times-BoldItalic"].includes(name));

export async function renderQuotationPdf(quote, images, kind = "quotation") {
  return pdfmake.createPdf(quotationDocumentDefinition(quote, images, kind)).getBuffer();
}

export async function quotationPdf(client, quote) {
  return renderQuotationPdf(quote, await quotationPdfImages(client, quote));
}

export async function salesDocumentPdf(client, document) {
  return renderQuotationPdf(document, await quotationPdfImages(client, document), document.kind);
}
