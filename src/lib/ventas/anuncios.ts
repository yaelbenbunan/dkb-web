/**
 * Convierte el cuerpo del webhook de anuncios (Zapier con Meta Lead Ads, o el
 * formulario de una landing) en un lead. Acepta los nombres de campo de Meta
 * y los nuestros en español, para no depender de cómo se configure el Zap.
 */

import { normalizarTelefono, parseTipoNegocio } from "./dominio";
import { EMAIL_RE, type LeadNuevo } from "./leads-csv";

const MAX_CAMPO = 200;
const MAX_TELEFONO = 40;
const MAX_EMAIL = 254;

export function leadDesdeAnuncio(
  datos: Record<string, unknown>,
):
  | { ok: true; lead: LeadNuevo; campana: string }
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
  const negocio = (texto("negocio", "empresa", "company_name", "business_name") || contacto).slice(0, MAX_CAMPO);
  const telefono = texto("telefono", "phone_number", "phone", "movil").slice(0, MAX_TELEFONO);
  const email = texto("email", "correo").slice(0, MAX_EMAIL);

  if (!negocio) return { ok: false, error: "falta_negocio" };
  if (!normalizarTelefono(telefono) && !email) return { ok: false, error: "falta_contacto" };
  if (email && !EMAIL_RE.test(email)) return { ok: false, error: "email_invalido" };

  return {
    ok: true,
    campana: texto("campana", "campaign_name", "campaign"),
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
