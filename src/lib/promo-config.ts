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
  fromName: "Paula de dinkbit",
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
 *  precio normal (tachado) y `now` el precio con el -50%.
 *
 *  Tres soluciones y no más: la tabla anterior tenía cinco filas repartidas en
 *  dos grupos y el lector tenía que buscar la suya. Con tres cifras redondas se
 *  entiende de un vistazo, que es lo que hace que un correo convierta.
 *
 *  Las condiciones que acotan estos precios están en PROMO_PRICE_DISCLAIMER: sin
 *  ellas, "Ecommerce 1.000€" comprometería el mismo precio para una tienda de
 *  veinte productos que para una de mil. */
export interface PromoPriceRow {
  label: string;
  before: string;
  now: string;
}

export const PROMO_PRICES: PromoPriceRow[] = [
  { label: "One page", before: "1.000€", now: "500€" },
  { label: "Sitio web", before: "2.000€", now: "1.000€" },
  { label: "Ecommerce", before: "2.000€", now: "1.000€" },
];

/** Letra pequeña de los precios. Acota el alcance sin sonar a contrato: dice qué
 *  entra en el precio y qué se presupuesta aparte, en vez de enumerar
 *  exclusiones. */
export const PROMO_PRICE_DISCLAIMER =
  "* Precios orientativos, IVA no incluido, para proyectos estándar: el sitio web incluye hasta 5 secciones y la tienda online hasta 50 productos. Si tu proyecto necesita más volumen, integraciones o funcionalidades a medida, lo vemos contigo y te pasamos un presupuesto cerrado antes de empezar. No incluyen la redacción de textos ni las imágenes, que aporta el cliente.";

/** Días que se le reserva el precio a quien deja su email. */
export const PROMO_RESERVATION_DAYS = 5;

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

/**
 * Fecha hasta la que se le reserva el precio a un lead concreto, contada desde
 * el envío de su correo.
 *
 * Se topa con el fin de la campaña: si alguien se apunta tres días antes del
 * cierre, no se le pueden prometer cinco. Prometer un precio que ya no existe
 * es peor que no dar plazo.
 */
export function promoReservationDeadline(sentAt: number): number {
  const personal = sentAt + PROMO_RESERVATION_DAYS * 24 * 60 * 60 * 1000;
  return Math.min(personal, Date.parse(PROMO.deadlineISO));
}

export function promoReservationLabel(sentAt: number): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Madrid",
  }).format(new Date(promoReservationDeadline(sentAt)));
}
