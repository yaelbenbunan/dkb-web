"use server";

import { revalidatePath } from "next/cache";
import { createManualLead } from "@/lib/imagina-leads";
import {
  borrarPlantilla,
  buscarLeadPorEmail,
  cerrarBusqueda,
  contarPendientes,
  crearBusqueda,
  enlazarLead,
  getProspecto,
  guardarEnriquecimiento,
  guardarPlantilla,
  guardarProspectos,
  marcarEstado,
  pendientesDeEnriquecer,
} from "@/lib/prospeccion/db";
import { enriquecerWeb } from "@/lib/prospeccion/enriquecer";
import { enviarProspectos, type ErrorEnvio } from "@/lib/prospeccion/enviar";
import { buscarEnPlaces } from "@/lib/prospeccion/places";
import { TEXTO_BLOQUEO } from "@/lib/prospeccion/reglas-envio";

const RUTA = "/panel/prospeccion";
const TANDA = 10;

type Resultado = { ok: true; mensaje: string } | { ok: false; error: string };

const TEXTO_ERROR: Record<ErrorEnvio, string> = {
  ...TEXTO_BLOQUEO,
  sin_remitente: "Falta configurar PROSPECT_SENDERS: sin un remitente de prospección no se envía.",
  remitente_no_permitido: "Ese remitente no está autorizado.",
  plantilla_no_encontrada: "La plantilla ya no existe.",
  tope_diario: "Se alcanzó el tope de envíos de hoy.",
  faltan_datos: "A la empresa le falta un dato que la plantilla usa",
  ya_reclamado: "Ya se le estaba enviando.",
  fallo_resend: "Resend rechazó el envío",
  error_datos: "No se pudo comprobar la lista de bajas, los leads o el tope de hoy. No se ha enviado; vuelve a intentarlo.",
  resultado_incierto: "No se sabe si el correo llegó a salir. Queda marcado como enviado para no escribir dos veces",
  email_repetido: "Ya se escribió a esa dirección desde otra ficha.",
  sin_baja: "No se puede firmar el enlace de baja (falta PROMO_TOKEN_SECRET o RESEND_API_KEY): no se envía.",
};

export async function buscarAction(
  categoria: string,
  ciudad: string,
): Promise<{ ok: true; searchId: string; mensaje: string } | { ok: false; error: string }> {
  const cat = categoria.trim().slice(0, 80);
  const ciu = ciudad.trim().slice(0, 80);
  if (!cat || !ciu) return { ok: false, error: "Indica qué buscar y en qué ciudad." };

  const searchId = await crearBusqueda("places", { categoria: cat, ciudad: ciu });
  if (!searchId) return { ok: false, error: "No se pudo guardar la búsqueda." };

  const r = await buscarEnPlaces({ categoria: cat, ciudad: ciu });
  if (!r.ok) {
    const error =
      r.error === "sin_clave"
        ? "Falta configurar GOOGLE_PLACES_API_KEY."
        : `Google Places devolvió un error (${r.detalle ?? "sin detalle"}).`;
    await cerrarBusqueda(searchId, { status: "error", error });
    revalidatePath(RUTA);
    return { ok: false, error };
  }

  const nuevas = await guardarProspectos(searchId, r.prospectos);
  await cerrarBusqueda(searchId, { status: "lista", total: r.prospectos.length });
  revalidatePath(RUTA);
  const repetidas = r.prospectos.length - nuevas;
  return {
    ok: true,
    searchId,
    mensaje:
      `${r.prospectos.length} empresas encontradas: ${nuevas} nuevas` +
      (repetidas > 0 ? ` y ${repetidas} que ya tenías.` : "."),
  };
}

/** Busca el email de hasta diez empresas de la búsqueda. El cliente la llama en
 *  bucle hasta que `restantes` llega a cero: así ninguna petición es larga y la
 *  barra de progreso avanza de verdad. */
export async function enriquecerTandaAction(
  searchId: string,
): Promise<{ procesados: number; restantes: number }> {
  const tanda = await pendientesDeEnriquecer(searchId, TANDA);
  await Promise.all(
    tanda.map(async (p) => {
      const r = await enriquecerWeb(p.website).catch(() => ({
        email: null,
        tipo: null,
        nota: "La web no responde.",
      }));
      await guardarEnriquecimiento(p.id, r);
    }),
  );
  const restantes = await contarPendientes(searchId);
  if (restantes === 0) revalidatePath(RUTA);
  // Si una tanda no avanzó (fallo de base de datos), se corta el bucle del cliente.
  return { procesados: tanda.length, restantes: tanda.length === 0 ? 0 : restantes };
}

export async function enviarAction(
  ids: string[],
  plantillaId: string,
  from: string,
  confirmarPersonal: boolean,
): Promise<Resultado> {
  if (ids.length === 0) return { ok: false, error: "No hay ninguna empresa seleccionada." };
  if (!plantillaId) return { ok: false, error: "Elige una plantilla." };
  const r = await enviarProspectos(ids.slice(0, 200), plantillaId, { from, confirmarPersonal });
  revalidatePath(RUTA);
  if (!r.ok) return { ok: false, error: TEXTO_ERROR[r.error ?? "fallo_resend"] };

  const motivos = [
    ...new Set(r.omitidos.map((o) => TEXTO_ERROR[o.motivo] + (o.detalle ? `: ${o.detalle}` : "."))),
  ];
  if (r.enviados === 0) {
    return { ok: false, error: `No se envió ninguno. ${motivos.join(" ")}` };
  }
  return {
    ok: true,
    mensaje:
      `${r.enviados} enviado${r.enviados === 1 ? "" : "s"}.` +
      (r.omitidos.length > 0 ? ` ${r.omitidos.length} sin enviar: ${motivos.join(" ")}` : ""),
  };
}

export async function descartarAction(ids: string[]): Promise<Resultado> {
  await marcarEstado(ids, "descartado", ["nuevo", "listo", "sin_contacto"]);
  revalidatePath(RUTA);
  return { ok: true, mensaje: `${ids.length} descartada${ids.length === 1 ? "" : "s"}.` };
}

export async function marcarRespondidoAction(id: string): Promise<Resultado> {
  await marcarEstado([id], "respondido", ["enviado"]);
  revalidatePath(RUTA);
  return { ok: true, mensaje: "Marcada como respondida." };
}

/** Pasa el prospecto al CRM. `consent` se queda sin definir: haber contestado a
 *  un correo no es consentimiento para recibir campañas. */
export async function convertirEnLeadAction(id: string): Promise<Resultado> {
  const p = await getProspecto(id);
  if (!p) return { ok: false, error: "Esa empresa ya no existe." };
  if (p.lead_id) return { ok: false, error: "Ya está en el CRM." };

  const existente = p.email ? await buscarLeadPorEmail(p.email) : null;
  if (existente) {
    await enlazarLead(id, existente);
    revalidatePath(RUTA);
    return { ok: true, mensaje: "Ya había un lead con ese email: queda enlazada con él." };
  }

  const alta = await createManualLead({
    name: p.name,
    email: p.email,
    phone: p.phone,
    website: p.website,
    channel: "Prospección",
    notes: [p.sector, p.city].filter(Boolean).join(" · ") || null,
  });
  if (!alta.ok || !alta.id) return { ok: false, error: "No se pudo crear el lead." };
  await enlazarLead(id, alta.id);
  revalidatePath(RUTA);
  revalidatePath("/panel");
  return { ok: true, mensaje: "Convertida en lead del CRM." };
}

export async function guardarPlantillaAction(p: {
  id?: string;
  name: string;
  subject: string;
  body: string;
}): Promise<Resultado> {
  const name = p.name.trim().slice(0, 80);
  const subject = p.subject.trim().slice(0, 200);
  const body = p.body.trim().slice(0, 5000);
  if (!name || !subject || !body) return { ok: false, error: "Nombre, asunto y texto son obligatorios." };
  const ok = await guardarPlantilla({ id: p.id, name, subject, body });
  revalidatePath(RUTA);
  return ok ? { ok: true, mensaje: "Plantilla guardada." } : { ok: false, error: "No se pudo guardar." };
}

export async function borrarPlantillaAction(id: string): Promise<Resultado> {
  await borrarPlantilla(id);
  revalidatePath(RUTA);
  return { ok: true, mensaje: "Plantilla borrada." };
}
