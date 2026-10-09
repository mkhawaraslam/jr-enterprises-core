import { formatQuotationDate } from "./adminQuotation";
import { isQuotationLayout } from "./quotationLayouts";

const money = (amount) => new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(amount);
const muted = "#52525b";
const line = "#e4e4e7";
const field = (label, value) => ({ text: [{ text: label + ": ", bold: true }, String(value)], margin: [0, 0, 0, 5] });

export function quotationDocumentDefinition(quote, images) {
  if (!isQuotationLayout(quote.layout_id, quote.layout_version)) throw new Error("Unsupported quotation template version.");
  const b = quote.business_snapshot; const c = quote.customer_snapshot; const accent = quote.accent;
  const classic = quote.layout_id === "reference-classic";
  const ledger = quote.layout_id === "ledger";
  const minimal = quote.layout_id === "minimal";
  const company = { stack: [{ image: "logo", fit: [115, 62], margin: [0, 0, 0, 7] }, { text: b.name, bold: true, fontSize: 12, color: accent }] };
  const contacts = { stack: [{ text: b.address }, { text: b.phone, margin: [0, 4, 0, 0] }, { text: b.email, margin: [0, 4, 0, 0] }, { text: "NTN: " + b.ntn, margin: [0, 4, 0, 0] }], color: muted, alignment: "right", fontSize: 9 };
  const recipient = { stack: [{ text: c.company_name, bold: true, fontSize: 12, margin: [0, 0, 0, 5] }, { text: c.name, margin: [0, 0, 0, 4] }, { text: c.address, margin: [0, 0, 0, 4] }, { text: c.phone, margin: [0, 0, 0, 4] }, { text: c.email }], fontSize: 10 };
  const metadata = { stack: [field("Quotation No", quote.reference), field("Date", formatQuotationDate(quote.date)), field("Valid until", formatQuotationDate(quote.valid_until))], fontSize: 10 };
  const heading = { text: "QUOTATION", fontSize: classic ? 27 : 23, bold: true, color: accent, margin: [0, 24, 0, 24], alignment: classic ? "center" : "left" };
  const rule = () => ({ canvas: [{ type: "line", x1: 0, y1: 0, x2: 519, y2: 0, lineWidth: minimal ? 1 : 2, lineColor: accent }], margin: [0, 16, 0, 18] });
  const content = [];
  if (ledger) {
    content.push({ columns: [{ width: "*", ...company }, { width: 210, stack: [{ ...heading, alignment: "right", margin: [0, 0, 0, 12] }, { ...metadata, alignment: "right" }] }], columnGap: 24 }, rule());
    content.push({ columns: [{ width: "*", ...recipient }, { width: 210, ...contacts }], columnGap: 24, margin: [0, 0, 0, 20] });
  } else {
    content.push({ columns: [{ width: "*", ...company }, { width: 245, ...contacts }], columnGap: 24 }, heading);
    if (classic) content.push({ columns: [{ width: "*", ...metadata }, { width: 210, ...recipient }], columnGap: 24 });
    else content.push({ columns: [{ width: "*", ...recipient }, { width: 210, ...metadata, alignment: "right" }], columnGap: 24 });
    content.push(rule());
  }
  if (quote.subject) content.push({ columns: [{ width: classic ? 155 : 95, text: "DESCRIPTION", bold: true, fontSize: 10 }, { width: "*", text: quote.subject, fontSize: 10, lineHeight: 1.3 }], columnGap: 12, margin: [0, 0, 0, 20] });
  const table = [["Description", "Qty", "Price (PKR)", "Amount (PKR)"].map((text, index) => ({ text, bold: true, alignment: index ? "right" : "left", color: minimal ? accent : "#ffffff", fillColor: minimal ? "#ffffff" : accent }))];
  for (const item of quote.items) table.push([
    { text: item.description, lineHeight: 1.2 },
    { text: money(item.quantity), alignment: "right" },
    { text: money(item.price), alignment: "right" },
    { text: money(item.amount), alignment: "right", bold: true },
  ]);
  content.push({ table: { headerRows: 1, dontBreakRows: true, widths: ["*", 42, 75, 89], body: table }, fontSize: 9,
    layout: { hLineWidth: (i) => minimal && i === 1 ? 1 : 0.6, vLineWidth: () => 0, hLineColor: (i) => i === 1 ? accent : line,
      paddingTop: () => classic ? 12 : 10, paddingBottom: () => classic ? 12 : 10, paddingLeft: () => 8, paddingRight: () => 8,
      fillColor: (row) => row > 0 && (classic || ledger) ? (row % 2 ? "#f7f7f8" : "#ffffff") : null } });
  content.push({ table: { widths: ["*", 128, 140], body: [[{ text: "", border: [false, false, false, false] }, { text: "TOTAL (PKR)", bold: true, color: accent, alignment: "right", border: [false, false, false, false], margin: [0, 6, 8, 6] }, { text: money(quote.total), bold: true, fontSize: 12, alignment: "right", color: "#ffffff", fillColor: accent, border: [false, false, false, false], margin: [6, 5, 6, 5] }]] }, layout: "noBorders", margin: [0, 14, 0, 22] });
  const terms = [b.special_notes, quote.notes].filter((value) => value?.trim()).join("\n\n");
  if (terms) content.push(rule(), { columns: [{ width: classic ? 155 : 95, text: "NOTES &\nINSTRUCTIONS", bold: true, fontSize: 10 }, { width: "*", text: terms, fontSize: 10, lineHeight: 1.3 }], columnGap: 12, margin: [0, 0, 0, 22] });
  content.push({ unbreakable: true, stack: [
    { text: classic ? "PLEASE CONFIRM YOUR ACCEPTANCE OF THIS QUOTATION" : "Authorization and acceptance", fontSize: 10, bold: true, margin: [0, 10, 0, 18] },
    { columns: [
      { width: "*", stack: [{ image: "signature", fit: [115, 42], margin: [0, 0, 0, 7] }, { canvas: [{ type: "line", x1: 0, y1: 0, x2: 142, y2: 0, lineWidth: 0.5, lineColor: muted }] }, { text: "Authorized signature", fontSize: 9, color: muted, margin: [0, 7, 0, 0] }] },
      { width: "*", stack: [{ text: " ", margin: [0, 0, 0, 38] }, { canvas: [{ type: "line", x1: 0, y1: 0, x2: 142, y2: 0, lineWidth: 0.5, lineColor: muted }] }, { text: "Customer acceptance", fontSize: 9, color: muted, margin: [0, 7, 0, 0] }] },
      { width: 108, stack: [{ text: " ", margin: [0, 0, 0, 38] }, { canvas: [{ type: "line", x1: 0, y1: 0, x2: 108, y2: 0, lineWidth: 0.5, lineColor: muted }] }, { text: "Date signed", fontSize: 9, color: muted, margin: [0, 7, 0, 0] }] },
    ], columnGap: 22 },
  ] });
  return {
    pageSize: "A4", pageMargins: [38, 40, 38, 48], defaultStyle: { font: "Roboto", fontSize: 10, color: "#18181b" },
    info: { title: quote.reference + " - " + b.name, author: b.name, subject: "Quotation for " + c.company_name }, images, content,
    header: (page) => page > 1 ? { columns: [{ text: b.name }, { text: quote.reference, alignment: "right" }], margin: [38, 16, 38, 0], fontSize: 8, color: muted } : null,
    footer: (page, count) => ({ columns: [{ text: quote.reference }, { text: `${page} / ${count}`, alignment: "right" }], margin: [38, 14, 38, 0], fontSize: 8, color: muted }),
  };
}
