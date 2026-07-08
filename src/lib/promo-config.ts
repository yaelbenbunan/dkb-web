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
  siteUrl: "https://www.dinkbit.es",
  /** Landing con los detalles de la promo (destino del "Más información"). */
  landingPath: "/promo-verano",
  questionnairePath: "/promo-verano/cuestionario",
  /** No volver a mostrar el popup al mismo visitante en N días. */
  frequencyDays: 7,
  /** Retardo antes de mostrar el popup. */
  showDelayMs: 8000,
} as const;

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
