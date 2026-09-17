/**
 * Convierte el cuerpo del webhook de anuncios (Zapier con Meta Lead Ads, o el
 * formulario de una landing) en un lead. Acepta los nombres de campo de Meta
 * y los nuestros en español, para no depender de cómo se configure el Zap.
 */

import { normalizarTelefono, parseTipoNegocio } from "./dominio";
import { EMAIL_RE, type LeadNuevo } from "./leads-csv";

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

  const contacto = texto("contacto", "full_name", "nombre", "name");
  const negocio = texto("negocio", "empresa", "company_name", "business_name") || contacto;
  const telefono = texto("telefono", "phone_number", "phone", "movil");
  const email = texto("email", "correo");

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
      ciudad: texto("ciudad", "city"),
      cif: texto("cif", "nif"),
      web: texto("web", "website"),
      tipo_negocio: parseTipoNegocio(texto("tipo_negocio", "tipo", "sector")),
    },
  };
}
