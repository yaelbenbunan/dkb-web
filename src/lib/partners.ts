export interface Partner {
  name: string;
  src: string;
  /** Si true, no aplica el filtro grayscale/brightness — el logo se ve siempre
   * a color completo. Útil para badges con fondo blanco (Google Workspace). */
  noFilter?: boolean;
}

export const PARTNERS: Partner[] = [
  { name: "Google Partner Premier", src: "/img/partners/google-partner-premier.png" },
  { name: "Meta Business Partner", src: "/img/partners/meta-business-partner.png" },
  { name: "Shopify Plus Partner", src: "/img/partners/shopify-plus-partner.svg" },
  { name: "Shopify Experts", src: "/img/partners/shopify-experts.webp" },
  { name: "Google Workspace", src: "/img/partners/google-workspace.png", noFilter: true },
  { name: "TikTok", src: "/img/partners/tiktok.png" },
  { name: "Spotify Advertising Certified", src: "/img/partners/spotify-advertising-certified.webp" },
  { name: "Laravel Certified Company", src: "/img/partners/laravel-certified.svg" },
  { name: "Strapi", src: "/img/partners/strapi.svg" },
  { name: "Stripe", src: "/img/partners/stripe.png" },
  { name: "PayPal", src: "/img/partners/paypal.png" },
  { name: "Cybersource - Visa", src: "/img/partners/cybersource-visa.png" },
  { name: "Openpay BBVA", src: "/img/partners/openpay-bbva.png" },
  { name: "XPRTS Ecommerce Lab", src: "/img/partners/xprts-ecommerce-lab.png" },
];
