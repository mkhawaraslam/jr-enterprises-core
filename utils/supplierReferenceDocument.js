import { formatQuotationDate } from "./adminQuotation";
import { validateBusinessLayout } from "./businessLayout";
import { businessCeoHeading } from "./businessTemplates";

const number = (value) => new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(value);
const ruled = {
  hLineWidth: () => 0.7, vLineWidth: () => 0.7,
  hLineColor: () => "#000000", vLineColor: () => "#000000",
  paddingLeft: () => 3, paddingRight: () => 3,
  paddingTop: () => 3, paddingBottom: () => 3,
};

// Version 2 reproduces the inspected supplier reference; version 1 stays unchanged.
export function supplierReferenceDocument(document, images, kind) {
  const business = document.business_snapshot; const customer = document.customer_snapshot;
  const layout = business.document_layout?.definition;
  if (!validateBusinessLayout(layout) || layout.schema !== 2) throw new Error("The saved reference mapping is unavailable.");
  const priced = kind !== "challan";
  const title = kind === "quotation" ? "QUOTATION" : kind === "invoice" ? "INVOICE" : "DELIVERY CHALLAN";
  const label = kind === "quotation" ? "Quotation" : kind === "invoice" ? "Invoice" : "Challan";
  const width = 612 - layout.margin * 2; const metadataWidth = 174; const gap = 40;
  const accent = document.accent; const fontSize = layout.fontSize;
  const address = kind === "challan" && document.delivery_address ? document.delivery_address : customer.address;
  const details = [customer.company_name && { text: customer.company_name, fontSize: 16 },
    { text: customer.name, fontSize: customer.company_name ? fontSize : 16 },
    ...[address, customer.phone, customer.email].filter(Boolean).map((text) => ({ text, margin: [0, 3, 0, 0] }))].filter(Boolean);
  const metadata = [[label + " No:", document.reference],
    ...(kind === "invoice" && document.customer_reference ? [["PO No:", document.customer_reference]] : []),
    [label + " Date:", formatQuotationDate(document.date)],
    ...(kind === "quotation" ? [["Valid until:", formatQuotationDate(document.valid_until)]] : []),
    ...(kind === "invoice" && document.due_date ? [["Due date:", formatQuotationDate(document.due_date)]] : []),
    ...(kind !== "invoice" && document.customer_reference ? [["Inquiry / PO No:", document.customer_reference]] : [])];
  const header = {
    columns: [{ width: 100, image: "logo", fit: [layout.logoWidth, 66], alignment: "center" },
      { width: "*", alignment: "center", stack: [
        { text: business.name, font: "Roboto", bold: true, fontSize: 30, color: accent, margin: [0, 0, 0, 3] },
        { text: businessCeoHeading, bold: true, fontSize: 11, margin: [0, 0, 0, 2] },
        { text: business.address, fontSize: 11, margin: [0, 0, 0, 2] },
        { text: [business.ntn && "NTN# " + business.ntn, business.phone && "Ph: " + business.phone,
          business.email && "E-mail: " + business.email].filter(Boolean).join(" , "), fontSize: 10.5 },
      ] }], columnGap: 12, margin: [0, 0, 0, 26],
  };
  const panels = { columns: [
    { width: width - metadataWidth - gap, stack: [
      { text: kind === "challan" ? "Deliver to:" : "Customer:", fontSize: 17, margin: [2, 0, 0, 0] },
      { table: { widths: ["*"], heights: [60], body: [[{ stack: details }]] }, layout: ruled },
    ] },
    { width: metadataWidth, table: { widths: [75, "*"], body: [
      [{ text: title, fontSize: kind === "challan" ? Math.min(layout.titleSize, 18) : layout.titleSize,
        color: "#ffffff", fillColor: accent, alignment: "center", colSpan: 2 }, {}],
      ...metadata.map(([key, value]) => [{ text: key, alignment: "center", fontSize: 9 }, { text: value, alignment: "right", fontSize: 9 }]),
    ] }, layout: ruled },
  ], columnGap: gap, margin: [0, 0, 0, 4] };
  const headings = priced ? ["Sr #", "Description", "Unit", "Qty", "Rate", "Total Amount"] : ["Sr #", "Description", "Unit", "Qty delivered"];
  const rows = [headings.map((text) => ({ text, alignment: "center" }))];
  for (const [index, item] of document.items.entries()) rows.push([
    { text: String(index + 1), alignment: "center" }, { text: item.description, lineHeight: 1.2 },
    { text: item.unit || "-", alignment: "center" }, { text: number(item.quantity), alignment: "center" },
    ...(priced ? [{ text: number(item.price), alignment: "right" }, { text: number(item.amount), alignment: "right" }] : []),
  ]);
  const table = { table: { headerRows: 1, dontBreakRows: true,
    widths: priced ? [18, "*", 23, 34, 74, 85] : [18, "*", 32, 85],
    heights: (row) => row === 0 ? 14 : { compact: 28, normal: 48, spacious: 64 }[layout.density], body: rows,
  }, layout: { ...ruled, paddingTop: () => 4, paddingBottom: () => 4 } };
  const notes = [business.special_notes, document.notes].filter((text) => text?.trim()).join("\n\n");
  const terms = { width: "*", stack: [
    ...(notes ? [{ text: "Special Notes and Instructions", fontSize: 12, margin: [2, 3, 0, 3] }, { text: notes, lineHeight: 1.3, margin: [2, 0, 0, 0] }] : []),
  ] };
  const totals = { width: metadataWidth, table: { widths: [75, "*"], body: [[
    { text: priced ? "Subtotal (PKR)" : "Total quantity", fontSize: 10 },
    { text: number(priced ? document.total : document.quantity_total), alignment: "right", fontSize: 12 },
  ]] }, layout: ruled };
  const signWidth = 214;
  const signature = { width: signWidth, alignment: "center", stack: [
    { image: "signature", fit: [115, 42], margin: [0, 0, 0, 4] },
    { canvas: [{ type: "line", x1: 0, y1: 0, x2: signWidth, y2: 0, lineWidth: 1.5 }] },
    { text: business.name, fontSize: 15, margin: [0, 2, 0, 2] },
    { canvas: [{ type: "line", x1: 0, y1: 0, x2: signWidth, y2: 0, lineWidth: 1.5 }] },
  ] };
  const content = [header, panels,
    ...(document.subject ? [{ text: document.subject, alignment: "center", fontSize: 9, margin: [0, 0, 0, 4] }] : []),
    table, { columns: [terms, totals], columnGap: 12, margin: [0, 0, 0, 32] },
    { unbreakable: true, stack: [
      { columns: [{ width: "*", stack: kind === "challan" ? [
        { text: "Received by: _______________________", margin: [0, 26, 0, 12] },
        { text: "Signature / date: ____________________" },
      ] : [{ text: "" }] }, signature], columnGap: 30, margin: [0, 0, 0, 32] },
      ...(layout.footer ? [
        { canvas: [{ type: "line", x1: 0, y1: 0, x2: width, y2: 0, lineWidth: 0.8 }] },
        { text: layout.footer, alignment: "center", fontSize: 12, margin: [0, 4, 0, 0] },
      ] : []),
    ] },
  ];
  return {
    pageSize: "LETTER", pageMargins: [layout.margin, 28, layout.margin, 42],
    defaultStyle: { font: "Times", fontSize, color: "#000000" },
    info: { title: document.reference + " - " + business.name, author: business.name, subject: label + " for " + (customer.company_name || customer.name) },
    images, content,
    header: (page) => page > 1 ? { columns: [{ text: business.name }, { text: document.reference, alignment: "right" }],
      margin: [layout.margin, 9, layout.margin, 0], font: "Times", fontSize: 8 } : null,
    footer: (page, count) => ({ columns: [{ width: "*", text: document.reference },
      { width: 120, text: "Date: " + formatQuotationDate(document.date), alignment: "center" },
      { width: 90, text: layout.pageNumbers ? page + " of " + count : "", alignment: "right" }],
    margin: [layout.margin, 14, layout.margin, 0], font: "Roboto", fontSize: 8 }),
  };
}
