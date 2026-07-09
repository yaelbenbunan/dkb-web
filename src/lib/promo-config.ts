/** Única fuente de verdad de la campaña "Promo Verano -50%". */
export const PROMO = {
  discountPct: 50,
  /** Fin de la promo (hora de Madrid). */
  deadlineISO: "2026-08-31T23:59:59+02:00",
  /** Tag en la audiencia de Mailchimp y campaña en el CRM. */
  mailchimpTag: "promo-verano-2026",
  channel: "promo-verano",
  campaign: "promo-verano-2026",
  /** Remitente verificado en Resend. */
  fromEmail: "hola@dinkbit.es",
  /** Nombre visible del remitente (se muestra en la bandeja en vez de "hola"). */
  fromName: "dinkbit",
  /** Contacto para los CTA del email (WhatsApp y llamada). */
  whatsappNumber: "34657559397",
  phoneNumber: "+34657559397",
  phoneDisplay: "+34 657 55 93 97",
  siteUrl: "https://www.dinkbit.es",
  /** Landing con los detalles de la promo (destino del "Más información"). */
  landingPath: "/promo-verano",
  questionnairePath: "/promo-verano/cuestionario",
  /** No volver a mostrar el popup al mismo visitante en N días. */
  frequencyDays: 7,
  /** Retardo antes de mostrar el popup. */
  showDelayMs: 3000,
} as const;

/** Precios de la promo (fuente única para el email y la landing). `before` es el
 *  precio normal (tachado) y `now` el precio con el -50%. */
export interface PromoPriceRow {
  label: string;
  before: string;
  now: string;
}

export const PROMO_PRICES: { group: string; rows: PromoPriceRow[] }[] = [
  {
    group: "Webs",
    rows: [
      { label: "Landing / One page", before: "1.000€", now: "500€" },
      { label: "Web completa (hasta 4 páginas)", before: "2.000€", now: "1.000€" },
      { label: "Web premium (+8 páginas + blog)", before: "4.000€", now: "2.000€" },
    ],
  },
  {
    group: "Ecommerce",
    rows: [
      { label: "Tienda online (hasta 50 productos)", before: "3.000€", now: "1.500€" },
      { label: "Tienda online (+50 productos)", before: "3.000€", now: "1.850€" },
    ],
  },
];

/** Letra pequeña de los precios. */
export const PROMO_PRICE_DISCLAIMER =
  "* El precio final depende de cada proyecto y puede variar según el número de páginas, funcionalidades, etc. Precios orientativos, IVA no incluido. No incluyen la creación de contenidos (textos e imágenes), que aporta el cliente.";

export function isPromoActive(now: number): boolean {
  return now <= Date.parse(PROMO.deadlineISO);
}

export function promoDeadlineLabel(): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Madrid",
  }).format(new Date(Date.parse(PROMO.deadlineISO)));
}
