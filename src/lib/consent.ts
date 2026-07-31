/**
 * Consentimiento para comunicaciones comerciales que llega desde fuera de la
 * web (formularios de Meta Lead Ads reenviados por Zapier).
 *
 * Vive aparte porque lo usan los dos endpoints de entrada de leads
 * (`/api/leads` y `/api/leads/kit-digital-2026`) y la lógica de "qué cuenta
 * como un sí" no debe divergir entre ellos.
 */

const CONSENT_YES = new Set(["true", "on", "yes", "si", "sí", "1"]);
const CONSENT_NO = new Set(["false", "off", "no", "0"]);

/**
 * Nombres de campo aceptados en el payload. El nombre lo elige quien monta el
 * Zap, así que se admiten las variantes razonables — igual que ya se hace con
 * name/email/phone.
 */
export const CONSENT_KEYS = [
  "consent",
  "consentimiento",
  "acepto_recibir_comunicaciones",
  "comunicaciones_comerciales",
  "marketing_consent",
  "disclaimer",
  "disclaimers",
  "optin",
  "opt_in",
] as const;

/**
 * Traduce la respuesta de la casilla de consentimiento. El valor varía según
 * el tipo de pregunta y el idioma del formulario ("true"/"false" en las de
 * tipo consentimiento, "sí"/"no" en las localizadas al español).
 *
 * Distingue tres estados a propósito: `true` (aceptó), `false` (la vio y la
 * dejó sin marcar) y `null` (no había pregunta, o llegó algo que no sabemos
 * interpretar). Un valor irreconocible NUNCA se resuelve como `true`: sin
 * respuesta clara no hay consentimiento, y el lead se queda fuera de las
 * campañas hasta que se confirme por otra vía.
 */
export function parseConsentAnswer(raw?: string | null): boolean | null {
  const v = (raw ?? "").trim().toLowerCase();
  if (!v) return null;
  if (CONSENT_YES.has(v)) return true;
  if (CONSENT_NO.has(v)) return false;
  console.warn(`[consent] respuesta de consentimiento no reconocida: ${JSON.stringify(raw)}`);
  return null;
}

/**
 * Lee la casilla de consentimiento de un formulario web.
 *
 * Devuelve boolean, nunca null: en estos formularios SIEMPRE se pregunta, así
 * que la ausencia del campo significa "la vio y no la marcó" (un no explícito),
 * no "no se le preguntó". El null se reserva para los leads antiguos y para los
 * webhooks sin pregunta de consentimiento.
 */
export function consentFromFormData(fd: FormData): boolean {
  const v = fd.get("consent");
  return typeof v === "string" && CONSENT_YES.has(v.trim().toLowerCase());
}
