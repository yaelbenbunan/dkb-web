import "server-only";
import { consentimientoVigente } from "../prospeccion/consentimiento";
import {
  actualizarLeadWeb,
  buscarLeadPorContacto,
  crearLeads,
  getUsuaria,
  listExclusiones,
  registrarActividad,
  type Marca,
  type Usuaria,
} from "./db";
import { clasificarLeads, type LeadNuevo } from "./leads-csv";

/**
 * Prospección → embudo de ventas. Una empresa a la que se le escribió desde la
 * pestaña de Prospección y contestó pasa a ser un lead de la marca.
 *
 * Va por `ventas_crear_leads`, la RPC de siempre (guarda ciudad y quién lo dio
 * de alta), y no por la de los leads de la web: así funciona aunque no se haya
 * ejecutado la migración de la unificación. Canal y `extra` se escriben
 * después; si esas columnas aún no existen, el lead queda igual de bien.
 *
 * `consentimiento` solo se marca si el prospecto aceptó por teléfono recibir
 * información (y no lo ha retirado); haber contestado a un correo, sin más, no
 * es aceptar campañas.
 */

export const CANAL_PROSPECCION = "Prospección";

export interface ProspectoParaEmbudo {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  city: string | null;
  sector: string | null;
  sent_at: string | null;
  consentimiento_at?: string | null;
  consentimiento_por?: string | null;
  consentimiento_nota?: string | null;
  consentimiento_retirado_at?: string | null;
}

export type ResultadoEmbudo = { ok: true; leadId: string; existia: boolean } | { ok: false; error: string };

const NO_SE_PUDO = { ok: false as const, error: "No se pudo crear el lead." };

function fechaMadrid(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

function notaDeOrigen(p: ProspectoParaEmbudo): string {
  const donde = [p.sector, p.city].filter(Boolean).join(" · ");
  const fecha = fechaMadrid(p.sent_at);
  return (
    `Viene de Prospección${donde ? ` (${donde})` : ""}.` +
    (fecha ? ` Se le escribió el ${fecha} y respondió.` : " Respondió al correo.")
  );
}

/** Cuándo y quién obtuvo el consentimiento, para el historial del lead. */
async function notaDeConsentimiento(p: ProspectoParaEmbudo): Promise<string> {
  const fecha = fechaMadrid(p.consentimiento_at ?? null);
  // Sin nombre se apunta igual: lo que importa es la fecha.
  const quien = p.consentimiento_por ? await getUsuaria(p.consentimiento_por).catch(() => null) : null;
  const detalle = [quien?.nombre ? `lo registró ${quien.nombre}` : null, p.consentimiento_nota?.trim() || null]
    .filter(Boolean)
    .join(": ");
  return `Aceptó recibir información por teléfono${fecha ? ` el ${fecha}` : ""}${detalle ? ` (${detalle})` : ""}.`;
}

function datosDeLead(p: ProspectoParaEmbudo): LeadNuevo {
  return {
    negocio: p.name.trim().slice(0, 200),
    tipo_negocio: null,
    contacto: "",
    telefono: p.phone?.trim() ?? "",
    email: p.email?.trim() ?? "",
    ciudad: p.city?.trim() ?? "",
    cif: "",
    web: p.website?.trim() ?? "",
  };
}

async function apuntarNota(leadId: string, usuariaId: string, nota: string) {
  // Sin que pueda tumbar el paso: el lead ya está guardado.
  try {
    await registrarActividad({ leadId, usuariaId, tipo: "nota", nota });
  } catch (error) {
    console.error("[ventas/prospeccion] no se pudo apuntar la nota", error);
  }
}

async function marcarConsentimiento(leadId: string) {
  // Sin que pueda tumbar el paso, como la nota: el lead ya está.
  try {
    const r = await actualizarLeadWeb(leadId, { consentimiento: true });
    if (!r.ok) console.error("[ventas/prospeccion] consentimiento sin guardar en el lead", leadId);
  } catch (error) {
    console.error("[ventas/prospeccion] consentimiento sin guardar en el lead", leadId, error);
  }
}

export async function pasarProspectoAlEmbudo(input: {
  marca: Marca;
  usuaria: Usuaria;
  prospecto: ProspectoParaEmbudo;
}): Promise<ResultadoEmbudo> {
  const { marca, usuaria, prospecto } = input;
  const datos = datosDeLead(prospecto);
  const contacto = { email: datos.email, telefono: datos.telefono };
  const consiente = consentimientoVigente(prospecto);
  const nota = consiente ? `${notaDeOrigen(prospecto)} ${await notaDeConsentimiento(prospecto)}` : notaDeOrigen(prospecto);
  const conConsentimiento = consiente ? { consentimiento: true } : {};

  try {
    const exclusiones = await listExclusiones(marca.id);
    if (clasificarLeads([datos], [], exclusiones).excluidos.length > 0) {
      return { ok: false, error: "Esta empresa está en la lista de exclusión de la marca: ya es cliente." };
    }

    // Ya era lead de la marca (por otro cauce): se enlaza, no se duplica.
    const existente = await buscarLeadPorContacto(marca.id, contacto);
    if (existente) {
      if (consiente) await marcarConsentimiento(existente.id);
      await apuntarNota(existente.id, usuaria.id, nota);
      return { ok: true, leadId: existente.id, existia: true };
    }

    const alta = await crearLeads({
      marcaId: marca.id,
      usuariaId: usuaria.id,
      origen: "manual",
      origenDetalle: CANAL_PROSPECCION,
      leads: [{ ...datos, excluido: false }],
    });
    if (!alta.ok) return NO_SE_PUDO;

    const lead = await buscarLeadPorContacto(marca.id, contacto);
    if (!lead) return NO_SE_PUDO;
    // Cero creados: otra petición lo dio de alta entre la búsqueda y el insert.
    if (alta.creados === 0) {
      if (consiente) await marcarConsentimiento(lead.id);
      await apuntarNota(lead.id, usuaria.id, nota);
      return { ok: true, leadId: lead.id, existia: true };
    }

    const cambios = await actualizarLeadWeb(lead.id, {
      canal: CANAL_PROSPECCION,
      extra: { ...(lead.extra ?? {}), sector: prospecto.sector, prospecto_id: prospecto.id },
      ...conConsentimiento,
    });
    if (!cambios.ok) console.error("[ventas/prospeccion] canal y extra sin guardar (¿falta la migración de la unificación?)");
    await apuntarNota(lead.id, usuaria.id, nota);
    return { ok: true, leadId: lead.id, existia: false };
  } catch (error) {
    console.error("[ventas/prospeccion] pasarProspectoAlEmbudo", error);
    return NO_SE_PUDO;
  }
}
