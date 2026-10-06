// Fictional records for design review only. No customer or financial data is fetched.
export const prototypeDate = "2026-10-05";
export const prototypePeriods = [
  { id: "october", label: "October 2026", prefix: "2026-10" },
  { id: "september", label: "September 2026", prefix: "2026-09" },
  { id: "all", label: "All sample dates", prefix: "" },
];

export const prototypeCustomers = [
  { id: "CUS-001", name: "Atlas Textile Mills", industry: "Textiles", city: "Faisalabad", contact: "Procurement team" },
  { id: "CUS-002", name: "Crescent Foods", industry: "Food & beverage", city: "Lahore", contact: "Purchasing department" },
  { id: "CUS-003", name: "Prime Engineering", industry: "Engineering", city: "Islamabad", contact: "Projects team" },
  { id: "CUS-004", name: "Metro Industries", industry: "Manufacturing", city: "Karachi", contact: "Maintenance team" },
  { id: "CUS-005", name: "National Packaging", industry: "Packaging", city: "Multan", contact: "Operations team" },
  { id: "CUS-006", name: "Summit Processing", industry: "Processing", city: "Rawalpindi", contact: "Procurement team" },
];

export const prototypeProducts = [
  { id: "PRD-001", name: "Pneumatic cylinder", category: "Pneumatics", brand: "SHAKO", price: 24000, image: "/assets/product-collections/pneumatic-cylinders.png" },
  { id: "PRD-002", name: "Solenoid valve", category: "Valves", brand: "SMC", price: 9500, image: "/assets/product-collections/solenoid-valves.png" },
  { id: "PRD-003", name: "Pressure gauge", category: "Instruments", brand: "WIKA", price: 6500, image: "/assets/product-collections/pressure-gauges-transmitters.png" },
  { id: "PRD-004", name: "Air service unit", category: "Air preparation", brand: "FESTO", price: 18500, image: "/assets/product-collections/air-service-units.png" },
  { id: "PRD-005", name: "Angle valve", category: "Valves", brand: "KITZ", price: 32000, image: "/assets/product-collections/angle-valves.png" },
  { id: "PRD-006", name: "Pneumatic fittings", category: "Fittings", brand: "Camozzi", price: 1250, image: "/assets/product-collections/pneumatic-pipes-fittings.png" },
];

function sampleDocument(id, type, customerIndex, date, status, productIndex, quantity, dueDate = null) {
  const product = prototypeProducts[productIndex];
  return {
    id, type, date, status, dueDate,
    customer: prototypeCustomers[customerIndex].name,
    amount: type === "Delivery Challan" ? null : product.price * quantity,
    items: [{ name: product.name, quantity, price: product.price }],
  };
}

export const prototypeDocuments = [
  sampleDocument("QT-2026-042", "Quotation", 0, "2026-10-05", "Draft", 0, 12),
  sampleDocument("INV-2026-076", "Invoice", 1, "2026-10-05", "Unpaid", 0, 8, "2026-10-19"),
  sampleDocument("DC-2026-029", "Delivery Challan", 2, "2026-10-04", "Ready", 3, 6),
  sampleDocument("INV-2026-075", "Invoice", 2, "2026-10-04", "Paid", 3, 6, "2026-10-18"),
  sampleDocument("QT-2026-041", "Quotation", 3, "2026-10-03", "Sent", 4, 5),
  sampleDocument("INV-2026-074", "Invoice", 4, "2026-10-02", "Overdue", 1, 12, "2026-10-04"),
  sampleDocument("DC-2026-028", "Delivery Challan", 5, "2026-10-02", "Delivered", 2, 20),
  sampleDocument("QT-2026-040", "Quotation", 5, "2026-10-01", "Accepted", 2, 20),
  sampleDocument("INV-2026-073", "Invoice", 5, "2026-10-01", "Paid", 2, 20, "2026-10-15"),
  sampleDocument("INV-2026-072", "Invoice", 0, "2026-09-29", "Overdue", 4, 8, "2026-10-02"),
  sampleDocument("QT-2026-039", "Quotation", 1, "2026-09-28", "Sent", 5, 30),
  sampleDocument("INV-2026-071", "Invoice", 3, "2026-09-25", "Paid", 1, 25, "2026-09-30"),
];

export const prototypeActivity = [
  { id: "activity-1", label: "Quotation drafted", detail: "QT-2026-042 / Atlas Textile Mills", time: "09:45", type: "Quotation" },
  { id: "activity-2", label: "Invoice issued", detail: "INV-2026-076 / Crescent Foods", time: "09:10", type: "Invoice" },
  { id: "activity-3", label: "Payment received", detail: "INV-2026-075 / Prime Engineering", time: "08:30", type: "Payment" },
];

export function formatAmount(amount) {
  return amount === null ? "-" : new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(amount);
}

export function formatDocumentDate(date) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(date + "T00:00:00Z"));
}

export function filterDocuments({ period = "october", type = "All", status = "All", query = "" } = {}) {
  const prefix = prototypePeriods.find((entry) => entry.id === period)?.prefix || "";
  const search = query.trim().toLowerCase();
  return prototypeDocuments.filter((document) => (
    document.date.startsWith(prefix) && (type === "All" || document.type === type) &&
    (status === "All" || document.status === status || (status === "Open" && document.type === "Quotation" && ["Draft", "Sent"].includes(document.status))) &&
    (!search || [document.id, document.customer, document.type, ...document.items.map((item) => item.name)].some((value) => value.toLowerCase().includes(search)))
  ));
}

export function getSalesSnapshot(period = "october") {
  const documents = filterDocuments({ period });
  const invoices = documents.filter((document) => document.type === "Invoice");
  const invoiced = invoices.reduce((total, invoice) => total + invoice.amount, 0);
  const received = invoices.filter((invoice) => invoice.status === "Paid").reduce((total, invoice) => total + invoice.amount, 0);
  return {
    invoiced, received, outstanding: invoiced - received,
    invoiceCount: invoices.length,
    overdueCount: invoices.filter((invoice) => invoice.status === "Overdue").length,
    pendingQuotes: documents.filter((document) => document.type === "Quotation" && ["Draft", "Sent"].includes(document.status)).length,
    readyDeliveries: documents.filter((document) => document.type === "Delivery Challan" && document.status === "Ready").length,
  };
}

export function documentsToCsv(documents) {
  const cell = (value) => {
    let text = String(value ?? "");
    if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  return [
    ["Document", "Type", "Customer", "Date", "Amount (PKR)", "Status"],
    ...documents.map((document) => [document.id, document.type, document.customer, document.date, document.amount, document.status]),
  ].map((row) => row.map(cell).join(",")).join("\r\n");
}
