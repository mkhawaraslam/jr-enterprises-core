import business from "./business.cjs";

export const businessPhone = {
  display: business.phoneDisplay,
  telephone: "tel:" + business.phone,
  whatsapp: "https://wa.me/" + business.phone.replace("+", "") + "?text=" + encodeURIComponent(
    "Hello JR Enterprises, I would like to enquire about an industrial product."
  ),
};
