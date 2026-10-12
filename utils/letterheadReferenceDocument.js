import { formatQuotationDate } from "./adminQuotation";
import { jrBusinessWebsite, validateBusinessLayout } from "./businessLayout";

const number = (value) => new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(value);
const grid = {
  hLineWidth: () => 0.8, vLineWidth: () => 0.8,
  hLineColor: () => "#000000", vLineColor: () => "#000000",
  paddingLeft: () => 3, paddingRight: () => 3,
  paddingTop: () => 4, paddingBottom: () => 4,
};

export function letterheadReferenceDocument(document, images, kind) {
  const business = document.business_snapshot; const customer = document.customer_snapshot;
  const layout = business.document_layout?.definition;
  if (!validateBusinessLayout(layout) || layout.reference !== "letterhead-grid-v1") throw new Error("The saved letterhead mapping is unavailable.");
  const priced = kind !== "challan"; const width = 612 - layout.margin * 2;
  const title = kind === "quotation" ? "Quotation" : kind === "invoice" ? "Invoice" : "Delivery Challan";
  const accent = document.accent; const metadataWidth = 174;
  const field = (label, value) => ({ columns: [{ width: 70, text: label }, { width: "*", text: value, alignment: "right" }], columnGap: 3, margin: [0, 0, 0, 6] });
  const address = kind === "challan" && document.delivery_address ? document.delivery_address : customer.address;
  const metadata = [field(title + " No:", document.reference), field("Date:", formatQuotationDate(document.date)),
    ...(document.customer_reference ? [field("Inquiry / PO:", document.customer_reference)] : []),
    ...(kind === "quotation" ? [{ text: "Valid until: " + formatQuotationDate(document.valid_until), color: accent }] : []),
    ...(kind === "invoice" && document.due_date ? [field("Due date:", formatQuotationDate(document.due_date))] : [])];
  const customerDetails = [{ text: customer.company_name || customer.name, font: "Times", bold: true, fontSize: 16, margin: [0, 0, 0, 2] },
    ...(address ? [{ text: "Address: " + address, margin: [0, 0, 0, 5] }] : []),
    ...(customer.company_name ? [{ text: "Attn: " + customer.name, margin: [0, 0, 0, 3] }] : []),
    ...[customer.phone, customer.email].filter(Boolean).map((text) => ({ text, margin: [0, 0, 0, 1] }))];
  const columnCount = priced ? 6 : 4; const customerSpan = priced ? 4 : 3;
  const blanks = (count) => Array.from({ length: count }, () => ({}));
  // Spanning the first row keeps the customer/metadata divider aligned with the item grid.
  const panels = [{ stack: customerDetails, colSpan: customerSpan }, ...blanks(customerSpan - 1),
    { stack: metadata, colSpan: columnCount - customerSpan }, ...blanks(columnCount - customerSpan - 1)];
  const headings = priced ? ["S.No", "Description", "Quantity", "Unit", "Rate", "Amount"] : ["S.No", "Description", "Unit", "Qty delivered"];
  const rows = [panels, headings.map((text) => ({ text, alignment: "center", bold: false }))];
  for (const [index, item] of document.items.entries()) rows.push([
    { text: String(index + 1), alignment: "center" }, { text: item.description, lineHeight: 1.15 },
    ...(priced ? [{ text: number(item.quantity), alignment: "center" }, { text: item.unit || "-", alignment: "center" },
      { text: number(item.price), alignment: "right" }, { text: number(item.amount), alignment: "right" }]
      : [{ text: item.unit || "-", alignment: "center" }, { text: number(item.quantity), alignment: "center" }]),
  ]);
  const tableWidths = priced ? [38, "*", 48, 44, 80, 80] : [38, "*", 44, metadataWidth - 7.2];
  // This identity supplies a known contact URL, not a reference-file mapping.
  const isJrEnterprises = business.name.toLowerCase().replace(/[^a-z0-9]/g, "") === "jrenterprises";
  const website = layout.letterhead?.website ?? (isJrEnterprises ? jrBusinessWebsite : "");
  const header = { columns: [
    { width: "*", columns: [{ width: layout.logoWidth, image: "logo", fit: [layout.logoWidth, 88] },
      { width: "*", text: business.name, fontSize: 28, bold: true, color: accent, margin: [0, 22, 0, 0] }], columnGap: 12 },
    { width: metadataWidth, alignment: "center", font: "Times", fontSize: 11, stack: [
      { text: business.address, margin: [0, 3, 0, 4] },
      ...[business.phone && "Call: " + business.phone, business.email && "Email: " + business.email, business.ntn && "NTN # " + business.ntn]
        .filter(Boolean).map((text) => ({ text, margin: [0, 0, 0, 4] })),
      ...(website ? [{ text: website, fontSize: 10, margin: [0, 0, 0, 0] }] : []),
    ] },
  ], columnGap: 16, margin: [0, 0, 0, 16] };
  const banner = { columns: [{ width: "*", text: "" }, { width: metadataWidth, table: { widths: ["*"], body: [[{
    text: title, alignment: "center", color: "#ffffff", fillColor: accent, fontSize: kind === "challan" ? Math.min(layout.titleSize, 18) : layout.titleSize, bold: true,
    margin: [0, 1, 0, 1],
  }]] }, layout: "noBorders" }], margin: [0, 0, 0, 10] };
  const notes = [business.special_notes, document.notes].filter((text) => text?.trim()).join("\n\n");
  const summary = { table: { widths: ["*", metadataWidth - 7.2], body: [[
    { stack: [...(notes ? [{ text: "Special Notes and Instructions", fontSize: 12, margin: [0, 0, 0, 4] }, { text: notes, lineHeight: 1.2 }] : [])] },
    { stack: [{ text: priced ? "Subtotal (PKR)" : "Total quantity", fontSize: 11, margin: [0, 0, 0, 6] },
      { text: number(priced ? document.total : document.quantity_total), alignment: "right", fontSize: 13, bold: true }], margin: [0, 2, 0, 2] },
  ]] }, layout: { ...grid, hLineWidth: (i) => i === 0 ? 0 : 0.8 }, margin: [0, 0, 0, 42] };
  const signature = { width: metadataWidth, alignment: "center", stack: [
    { image: "signature", fit: [115, 42], margin: [0, 0, 0, 5] },
    { canvas: [{ type: "line", x1: 0, y1: 0, x2: metadataWidth, y2: 0, lineWidth: 0.6 }] },
    { text: business.name, font: "Times", fontSize: 15, bold: true, margin: [0, 3, 0, 0] },
  ] };
  return {
    pageSize: "LETTER", pageMargins: [layout.margin, 26, layout.margin, 42],
    defaultStyle: { font: "Roboto", fontSize: layout.fontSize, color: "#000000" },
    info: { title: document.reference + " - " + business.name, author: business.name, subject: title + " for " + (customer.company_name || customer.name) },
    images, content: [header, banner,
      ...(document.subject ? [{ text: document.subject, fontSize: 9, margin: [0, 0, 0, 5] }] : []),
      { text: "Customer:", font: "Times", bold: true, fontSize: 12, margin: [0, 0, 0, 1] },
      { table: { widths: tableWidths, body: rows, headerRows: 2, dontBreakRows: true,
        heights: (row) => row === 0 ? 76 : row === 1 ? 10 : { compact: 28, normal: 46, spacious: 64 }[layout.density] }, layout: grid },
      summary, { unbreakable: true, stack: [
        { columns: [{ width: "*", stack: kind === "challan" ? [{ text: "Received by: _____________________", margin: [0, 20, 0, 10] }, { text: "Signature / date: __________________" }] : [{ text: "" }] }, signature], columnGap: 16 },
        ...(layout.footer ? [{ text: layout.footer, alignment: "center", margin: [0, 24, 0, 0] }] : []),
      ] },
    ],
    header: (page) => page > 1 ? { columns: [{ text: business.name }, { text: document.reference, alignment: "right" }], margin: [layout.margin, 8, layout.margin, 0], fontSize: 8 } : null,
    footer: (page, count) => ({ columns: [{ width: "*", text: "Generated by: " + business.name }, { width: 130, text: "Date: " + formatQuotationDate(document.date), alignment: "center" },
      { width: 60, text: layout.pageNumbers ? page + " of " + count : "", alignment: "right" }], margin: [layout.margin, 14, layout.margin, 0], fontSize: 7 }),
  };
}
