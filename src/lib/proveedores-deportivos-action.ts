"use server";

import { cookies, headers } from "next/headers";
import { CONTACT_INFO } from "./contact-info";
import { sendMetaLead } from "./meta-capi";
import { leerSolicitud, MARCA_PROVEEDORES_DEPORTIVOS_SLUG, notaSolicitudPack, type ErroresSolicitud } from "./proveedores-deportivos";
import { crearLimitador, esEnvioBot } from "./ventas/formulario-web";
import { recibirLeadFormulario } from "./ventas/servicios";

export type ResultadoSolicitud =
  | { ok: true }
  | { ok: false; error: string; errores?: ErroresSolicitud; whatsapp?: string };

const permitir = crearLimitador({ max: 5, ventanaMs: 10 * 60 * 1000 });
const WHATSAPP = `${CONTACT_INFO.socials.whatsapp}?text=${encodeURIComponent("Hola, quiero el Pack Campaña + CRM")}`;

/**
 * Solicitudes de la landing de proveedores deportivos → lead en /panel/ventas.
 *
 * Mismo orden que el resto de formularios: el lead primero y la conversión a
 * Meta después, y solo si el lead se guardó (sin lead, no hay conversión que
 * contar). Un repetido cuenta como éxito: `recibirLeadFormulario` ya apunta la
 * vuelta en su ficha.
 */
export async function enviarSolicitudPack(fd: FormData): Promise<ResultadoSolicitud> {
  if (esEnvioBot({ website_url: fd.get("website_url") ?? "" })) return { ok: true };

  const h = await headers();
  const ip = h.get("cf-connecting-ip")?.trim() || h.get("x-real-ip")?.trim() || (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "desconocida";
  if (!permitir(`proveedores-deportivos:${ip}`)) {
    return { ok: false, error: "Has enviado varias solicitudes seguidas. Prueba en unos minutos o escríbenos por WhatsApp.", whatsapp: WHATSAPP };
  }

  const leido = leerSolicitud(fd);
  if (!leido.ok) return { ok: false, error: "Revisa los campos marcados.", errores: leido.errores };
  const s = leido.datos;

  let r: { status: number; body: Record<string, unknown> };
  try {
    r = await recibirLeadFormulario({
      slug: MARCA_PROVEEDORES_DEPORTIVOS_SLUG,
      datos: { contacto: s.nombre, negocio: s.empresa, email: s.email, telefono: s.telefono, web: s.web },
      nota: notaSolicitudPack(s),
    });
  } catch (e) {
    console.error("[proveedores-deportivos] fallo guardando el lead", e);
    r = { status: 500, body: { ok: false } };
  }
  if (r.status !== 200 || r.body.ok !== true) {
    console.error("[proveedores-deportivos] lead no guardado", r);
    return { ok: false, error: "No hemos podido enviar tu solicitud. Escríbenos por WhatsApp y lo vemos al momento.", whatsapp: WHATSAPP };
  }

  const eventId = String(fd.get("eventId") ?? "");
  if (eventId) {
    const c = await cookies();
    await sendMetaLead({
      eventId,
      email: s.email,
      phone: s.telefono,
      sourceUrl: String(fd.get("pageUrl") ?? ""),
      userAgent: h.get("user-agent"),
      clientIp: h.get("x-real-ip") ?? h.get("x-forwarded-for"),
      fbp: c.get("_fbp")?.value,
      fbc: c.get("_fbc")?.value,
    });
  }
  return { ok: true };
}
