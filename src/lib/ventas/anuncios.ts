/**
 * Convierte el cuerpo del webhook de anuncios (Zapier con Meta Lead Ads, o el
 * formulario de una landing) en un lead. Acepta los nombres de campo de Meta
 * y los nuestros en español, para no depender de cómo se configure el Zap.
 *
 * Lo que el lead no tiene como columna (horario para llamar, nombre del
 * anuncio, respuestas propias de cada formulario) llega junto en `nota`, ya
 * redactado en el Zap, y acaba como primera nota de su historial.
 */

import { normalizarTelefono, parseTipoNegocio } from "./dominio";
import { EMAIL_RE, type LeadNuevo } from "./leads-csv";

const MAX_CAMPO = 200;
const MAX_TELEFONO = 40;
const MAX_EMAIL = 254;
// El mismo tope que las notas que se escriben a mano en la ficha (`validacion.ts`).
const MAX_NOTA = 2000;
export const MAX_EXTRA = 80;

/** Datos del formulario del anuncio que no identifican al lead pero sí lo cualifican. */
export interface ExtrasLead {
  /** Socios o usuarios activos del centro, tal como se contesta: «100 a 300». */
  socios: string;
  /** Puesto de quien deja sus datos: «Propietario / socio». */
  cargo: string;
}

/**
 * Las respuestas de opción de Meta llegan como `_100_a_300` o
 * `propietario_/_socio`: se dejan legibles («100 a 300», «Propietario / socio»).
 * Un texto ya escrito por una persona sale igual, salvo la mayúscula inicial.
 */
export function limpiarRespuesta(raw: string): string {
  const limpio = raw.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  return limpio ? limpio[0].toLocaleUpperCase("es-ES") + limpio.slice(1) : "";
}

export function leadDesdeAnuncio(
  datos: Record<string, unknown>,
):
  | { ok: true; lead: LeadNuevo; campana: string; nota: string; extras: ExtrasLead }
  | { ok: false; error: "falta_negocio" | "falta_contacto" | "email_invalido" } {
  const texto = (...claves: string[]): string => {
    for (const clave of claves) {
      const valor = datos[clave];
      if (typeof valor === "string" && valor.trim()) return valor.trim();
      if (typeof valor === "number") return String(valor);
    }
    return "";
  };

  const contacto = texto("contacto", "full_name", "nombre", "name").slice(0, MAX_CAMPO);
  const negocio = (texto("negocio", "empresa", "company_name", "company", "business_name") || contacto).slice(0, MAX_CAMPO);
  const telefono = texto("telefono", "phone_number", "phone", "movil").slice(0, MAX_TELEFONO);
  const email = texto("email", "correo", "mail", "e-mail").slice(0, MAX_EMAIL);

  if (!negocio) return { ok: false, error: "falta_negocio" };
  if (!normalizarTelefono(telefono) && !email) return { ok: false, error: "falta_contacto" };
  if (email && !EMAIL_RE.test(email)) return { ok: false, error: "email_invalido" };

  return {
    ok: true,
    campana: texto("campana", "campaign_name", "campaign"),
    nota: texto("nota", "notas", "notes").slice(0, MAX_NOTA),
    extras: {
      socios: limpiarRespuesta(texto("socios", "num_socios", "numero_socios", "usuarios_activos")).slice(0, MAX_EXTRA),
      cargo: limpiarRespuesta(texto("cargo", "puesto", "rol", "job_title")).slice(0, MAX_EXTRA),
    },
    lead: {
      negocio,
      contacto,
      telefono,
      email,
      ciudad: texto("ciudad", "city").slice(0, MAX_CAMPO),
      cif: texto("cif", "nif").slice(0, MAX_CAMPO),
      web: texto("web", "website").slice(0, MAX_CAMPO),
      tipo_negocio: parseTipoNegocio(texto("tipo_negocio", "tipo", "sector")),
    },
  };
}
