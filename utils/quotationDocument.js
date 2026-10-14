import { formatQuotationDate } from "./adminQuotation";
import { isQuotationLayout } from "./quotationLayouts";
import { salesDocumentType } from "./adminSalesDocument";
import { validateBusinessLayout } from "./businessLayout";
import { businessCeoHeading } from "./businessTemplates";
import { supplierReferenceDocument } from "./supplierReferenceDocument";
import { letterheadReferenceDocument } from "./letterheadReferenceDocument";

const money = (amount) => new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(amount);
const muted = "#52525b";
const line = "#e4e4e7";
const field = (label, value) => ({ text: [{ text: label + ": ", bold: true }, String(value)], margin: [0, 0, 0, 5] });

export function quotationDocumentDefinition(quote, images, kind = "quotation") {
  if (!isQuotationLayout(quote.layout_id, quote.layout_version)) throw new Error("Unsupported quotation template version.");
  const type = kind === "quotation" ? { name: "Quotation", title: "QUOTATION", priced: true } : salesDocumentType(kind);
  if (!type) throw new Error("Unsupported document type.");
  if (quote.layout_id === "custom-mapped" && quote.layout_version === 2) return quote.business_snapshot.document_layout?.definition.reference === "letterhead-grid-v1"
    ? letterheadReferenceDocument(quote, images, kind) : supplierReferenceDocument(quote, images, kind);
  const b = quote.business_snapshot; const c = quote.customer_snapshot; const accent = quote.accent;
  const custom = quote.layout_id === "custom-mapped" ? b.document_layout?.definition : null;
  if (quote.layout_id === "custom-mapped" && (!validateBusinessLayout(custom) || custom.schema !== 1)) throw new Error("The saved custom layout is unavailable.");
  const margin = custom?.margin || 38; const pageWidth = custom ? 595.28 - margin * 2 : 519;
  const fontSize = custom?.fontSize || 10;
  const classic = quote.layout_id === "reference-classic";
  const ledger = custom ? custom.header === "compact" : quote.layout_id === "ledger";
  const minimal = custom ? custom.tableHeader === "line" : quote.layout_id === "minimal";
  const company = { stack: [{ image: "logo", fit: [custom?.logoWidth || 115, custom ? 72 : 62], margin: [0, 0, 0, 7] }, { text: b.name, bold: true, fontSize: 12, color: accent }] };
  const contacts = { stack: [{ text: businessCeoHeading, bold: true, margin: [0, 0, 0, 3] }, { text: b.address }, { text: b.phone, margin: [0, custom ? 3 : 4, 0, 0] }, { text: b.email, margin: [0, custom ? 3 : 4, 0, 0] }, { text: "NTN: " + b.ntn, margin: [0, custom ? 3 : 4, 0, 0] }], color: muted, alignment: "right", fontSize: 9 };
  const recipient = { stack: [
    ...(kind !== "quotation" ? [{ text: type.priced ? "BILL TO" : "DELIVER TO", bold: true, color: accent, fontSize: 9, margin: [0, 0, 0, 7] }] : []),
    ...[c.company_name, c.name, kind === "challan" && quote.delivery_address ? quote.delivery_address : c.address, c.phone, c.email].filter(Boolean).map((text, index) => ({ text, bold: index === 0, fontSize: index === 0 ? 12 : fontSize, margin: [0, 0, 0, 4] })),
  ], fontSize: 10 };
  const metadata = { stack: [field(type.name + " No", quote.reference),
    ...(kind === "invoice" && quote.customer_reference ? [field("PO No", quote.customer_reference)] : []),
    field("Date", formatQuotationDate(quote.date)),
    ...(kind === "quotation" ? [field("Valid until", formatQuotationDate(quote.valid_until))] : []),
    ...(kind === "invoice" && quote.due_date ? [field("Due date", formatQuotationDate(quote.due_date))] : []),
    ...(kind !== "invoice" && quote.customer_reference ? [field("Customer reference", quote.customer_reference)] : []),
  ], fontSize };
  const heading = { text: type.title, fontSize: custom?.titleSize || (classic ? 27 : 23), bold: true, color: accent, margin: custom ? [0, 18, 0, 18] : [0, 24, 0, 24], alignment: custom?.titleAlign || (classic ? "center" : "left") };
  const rule = () => ({ canvas: [{ type: "line", x1: 0, y1: 0, x2: pageWidth, y2: 0, lineWidth: minimal ? 1 : 2, lineColor: accent }], margin: custom ? [0, 12, 0, 12] : [0, 16, 0, 18] });
  const content = [];
  if (ledger) {
    content.push({ columns: [{ width: "*", ...company }, { width: 210, stack: [{ ...heading, alignment: custom?.titleAlign || "right", margin: [0, 0, 0, 12] }, { ...metadata, alignment: "right" }] }], columnGap: 24 }, rule());
    content.push({ columns: custom?.recipientSide === "right" ? [{ width: "*", ...contacts, alignment: "left" }, { width: 210, ...recipient }] : [{ width: "*", ...recipient }, { width: 210, ...contacts }], columnGap: 24, margin: [0, 0, 0, 20] });
  } else {
    if (custom?.header === "centered") content.push({ stack: [{ ...company, alignment: "center" }, { ...contacts, alignment: "center", margin: [0, 10, 0, 0] }] }, heading);
    else content.push({ columns: [{ width: "*", ...company }, { width: 245, ...contacts }], columnGap: 24 }, heading);
    if (custom ? custom.recipientSide === "right" : classic) content.push({ columns: [{ width: "*", ...metadata }, { width: 210, ...recipient }], columnGap: 24 });
    else content.push({ columns: [{ width: "*", ...recipient }, { width: 210, ...metadata, alignment: "right" }], columnGap: 24 });
    content.push(rule());
  }
  if (quote.subject) content.push({ columns: [{ width: classic ? 155 : 95, text: "DESCRIPTION", bold: true, fontSize: 10 }, { width: "*", text: quote.subject, fontSize: 10, lineHeight: 1.3 }], columnGap: 12, margin: [0, 0, 0, custom ? 14 : 20] });
  // Old issued items have no unit snapshot and retain their original table layout.
  const hasUnits = quote.items.some((item) => item.unit);
  const headings = ["Description", ...(hasUnits ? ["Unit"] : []), ...(type.priced ? ["Qty", "Price (PKR)", "Amount (PKR)"] : ["Qty delivered"])];
  const table = [headings.map((text, index) => ({ text, bold: true, alignment: index ? "right" : "left", color: minimal ? accent : "#ffffff", fillColor: minimal ? "#ffffff" : accent }))];
  for (const item of quote.items) table.push([
    { text: item.description, lineHeight: 1.2 },
    ...(hasUnits ? [{ text: item.unit || "-", alignment: "center" }] : []),
    { text: money(item.quantity), alignment: "right" },
    ...(type.priced ? [{ text: money(item.price), alignment: "right" }, { text: money(item.amount), alignment: "right", bold: true }] : []),
  ]);
  const padding = custom ? { compact: 6, normal: 10, spacious: 14 }[custom.density] : classic ? 12 : 10;
  content.push({ table: { headerRows: 1, dontBreakRows: true, widths: ["*", ...(hasUnits ? [34] : []), ...(type.priced ? [42, 75, 89] : [90])], body: table }, fontSize: custom ? fontSize - 1 : 9,
    layout: { hLineWidth: (i) => minimal && i === 1 ? 1 : 0.6, vLineWidth: () => custom?.tableBorders === "grid" ? 0.6 : 0, hLineColor: (i) => i === 1 ? accent : line, vLineColor: () => line,
      paddingTop: () => padding, paddingBottom: () => padding, paddingLeft: () => 8, paddingRight: () => 8,
      fillColor: (row) => row > 0 && (custom ? custom.rows === "striped" : classic || ledger) ? (row % 2 ? "#f7f7f8" : "#ffffff") : null } });
  content.push({ table: { widths: ["*", 128, 140], body: [[{ text: "", border: [false, false, false, false] }, { text: type.priced ? "TOTAL (PKR)" : "TOTAL QUANTITY", bold: true, color: accent, alignment: "right", border: [false, false, false, false], margin: [0, 6, 8, 6] }, { text: money(type.priced ? quote.total : quote.quantity_total), bold: true, fontSize: 12, alignment: "right", color: "#ffffff", fillColor: accent, border: [false, false, false, false], margin: [6, 5, 6, 5] }]] }, layout: "noBorders", margin: [0, 14, 0, custom ? 14 : 22] });
  const terms = [b.special_notes, quote.notes].filter((value) => value?.trim()).join("\n\n");
  if (terms) content.push(rule(), custom?.notes === "stacked" ? { stack: [{ text: "NOTES & INSTRUCTIONS", bold: true, margin: [0, 0, 0, 8] }, { text: terms, lineHeight: 1.3 }], fontSize, margin: [0, 0, 0, 14] } : { columns: [{ width: classic ? 155 : 95, text: "NOTES &\nINSTRUCTIONS", bold: true, fontSize }, { width: "*", text: terms, fontSize, lineHeight: 1.3 }], columnGap: 12, margin: [0, 0, 0, custom ? 14 : 22] });
  const authorized = { width: "*", stack: [{ image: "signature", fit: [115, 42], margin: [0, 0, 0, 7] }, { canvas: [{ type: "line", x1: 0, y1: 0, x2: 142, y2: 0, lineWidth: 0.5, lineColor: muted }] }, { text: "Authorized signature", fontSize: 9, color: muted, margin: [0, 7, 0, 0] }] };
  const signatureColumns = [authorized,
    ...(kind !== "invoice" ? [{ width: "*", stack: [{ text: " ", margin: [0, 0, 0, 38] }, { canvas: [{ type: "line", x1: 0, y1: 0, x2: 142, y2: 0, lineWidth: 0.5, lineColor: muted }] }, { text: kind === "challan" ? "Received by / signature" : "Customer acceptance", fontSize: 9, color: muted, margin: [0, 7, 0, 0] }] },
      { width: 108, stack: [{ text: " ", margin: [0, 0, 0, 38] }, { canvas: [{ type: "line", x1: 0, y1: 0, x2: 108, y2: 0, lineWidth: 0.5, lineColor: muted }] }, { text: kind === "challan" ? "Date received" : "Date signed", fontSize: 9, color: muted, margin: [0, 7, 0, 0] }] }] : []),
  ];
  if (custom?.signatureSide === "right") { signatureColumns.shift(); if (kind === "invoice") signatureColumns.push({ width: "*", text: "" }); signatureColumns.push({ ...authorized, width: 142 }); }
  content.push({ unbreakable: true, stack: [
    { text: kind === "challan" ? "Goods received acknowledgment" : kind === "invoice" ? "Authorization" : classic ? "PLEASE CONFIRM YOUR ACCEPTANCE OF THIS QUOTATION" : "Authorization and acceptance", fontSize: 10, bold: true, margin: custom ? [0, 6, 0, 12] : [0, 10, 0, 18] },
    { columns: signatureColumns, columnGap: 22 },
  ] });
  return {
    pageSize: "A4", pageMargins: custom ? [margin, margin, margin, Math.max(margin, 48)] : [38, 40, 38, 48], defaultStyle: { font: "Roboto", fontSize, color: "#18181b" },
    info: { title: quote.reference + " - " + b.name, author: b.name, subject: type.name + " for " + (c.company_name || c.name) }, images, content,
    header: (page) => page > 1 ? { columns: [{ text: b.name }, { text: quote.reference, alignment: "right" }], margin: [margin, custom ? 10 : 16, margin, 0], fontSize: 8, color: muted } : null,
    footer: (page, count) => ({ columns: custom ? [{ width: "*", text: custom.footer || quote.reference }, { width: 55, text: custom.pageNumbers ? `${page} / ${count}` : "", alignment: "right" }] : [{ text: quote.reference }, { text: `${page} / ${count}`, alignment: "right" }], margin: [margin, 14, margin, 0], fontSize: 8, color: muted }),
  };
}
