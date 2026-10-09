export const PRODUCT_PAGE_SIZE = 12;
export const MAX_PRODUCT_PRICE = 2147483647;
export const productLimits = { name: 150, price: 10 };
export const emptyProduct = { name: "", price: "" };

export function normalizeProduct(values) {
  return {
    name: typeof values?.name === "string" ? values.name.trim() : "",
    price: typeof values?.price === "string" ? values.price.trim() : typeof values?.price === "number" && Number.isFinite(values.price) ? String(values.price) : "",
  };
}

export function validateProduct(values) {
  const product = normalizeProduct(values);
  const errors = {};
  if (!product.name) errors.name = "Enter the product name.";
  else if (product.name.length > productLimits.name) errors.name = `Use ${productLimits.name} characters or fewer.`;
  if (!product.price) errors.price = "Enter the price.";
  else if (!/^\d+$/.test(product.price)) errors.price = "Enter a whole-number price of 0 or more.";
  else if (!Number.isSafeInteger(Number(product.price)) || Number(product.price) > MAX_PRODUCT_PRICE) errors.price = "Price cannot exceed PKR 2,147,483,647.";
  return errors;
}

export function formatProductPrice(price) {
  return "PKR " + new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(price);
}
