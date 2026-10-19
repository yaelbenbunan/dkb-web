/**
 * Consentimiento para escribir por email a un prospecto.
 *
 * LSSI art. 21: una comunicación comercial por email necesita que el
 * destinatario la haya pedido o autorizado antes, también si es una empresa. Se
 * llama por teléfono y, si en la llamada aceptan recibir información, se
 * registra aquí. Puro y sin `server-only`: lo usan el panel y el envío.
 */

export interface DatosConsentimiento {
  /** Opcionales: sin la migración de 2026-10-19 las filas no las traen. */
  consentimiento_at?: string | null;
  consentimiento_retirado_at?: string | null;
}

/** ¿Se le puede escribir? Sin las columnas, nadie tiene consentimiento. */
export function consentimientoVigente(p: DatosConsentimiento): boolean {
  return Boolean(p.consentimiento_at) && !p.consentimiento_retirado_at;
}

/** «19 de octubre de 2026», en hora de Madrid; null si no es una fecha. */
export function fechaLarga(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const MAX_NOTA = 300;

export type ConsentimientoValidado =
  | { ok: true; email: string; nota: string | null }
  | { ok: false; error: string };

export function validarConsentimiento(email: string, nota: string): ConsentimientoValidado {
  const limpio = email.trim().toLowerCase();
  if (!RE_EMAIL.test(limpio) || limpio.length > 254) {
    return { ok: false, error: "Escribe el email al que quiere que le escribamos." };
  }
  const n = nota.trim().slice(0, MAX_NOTA);
  return { ok: true, email: limpio, nota: n || null };
}

/** Lo que hay que decir al llamar: la información del art. 14 RGPD (los datos
 *  no nos los dio el negocio) y lo que hay que comprobar antes. */
export const GUION_LLAMADA = [
  "Antes de llamar a un autónomo (persona física), comprueba que su teléfono no está en la Lista Robinson. A una sociedad (S.L., S.A.) se le puede llamar.",
  "«Hola, le llamo de dinkbit, una agencia de marketing digital de Madrid.»",
  "«Hemos sacado su teléfono de directorios públicos de negocios.»",
  "«Le llamo para contarle cómo podemos ayudarle con su web y su captación de clientes. ¿Le puedo enviar información por email?»",
  "Si dice que sí: pide el email al que escribir y márcalo con «Ha aceptado recibir información». Si dice que no, no se le escribe.",
  "Si pregunta: sus datos se tratan como explica dinkbit.es/privacidad y puede pedir que no le volvamos a contactar.",
];
