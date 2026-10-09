export const CUSTOMER_PAGE_SIZE = 12;
export const emptyCustomer = { name: "", company_name: "", email: "", phone: "", address: "" };
export const customerLimits = { name: 150, company_name: 150, email: 254, phone: 25, address: 1000 };

export function normalizeCustomer(values) {
  return Object.fromEntries(Object.keys(emptyCustomer).map((key) => [key, typeof values?.[key] === "string" ? values[key].trim() : ""]));
}

export function validateCustomer(values) {
  const customer = normalizeCustomer(values);
  const errors = {};
  const labels = { name: "customer name", company_name: "company name", email: "email", phone: "phone number", address: "address" };
  for (const key of Object.keys(customer)) {
    if (!customer[key]) errors[key] = `Enter the ${labels[key]}.`;
    else if (customer[key].length > customerLimits[key]) errors[key] = `Use ${customerLimits[key]} characters or fewer.`;
  }
  if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) errors.email = "Enter a valid email address.";
  if (customer.phone && (!/^\+?[\d\s().-]+$/.test(customer.phone) || customer.phone.replace(/\D/g, "").length < 7)) errors.phone = "Enter a valid phone number.";
  return errors;
}
