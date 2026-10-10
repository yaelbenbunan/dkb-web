"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { accesoMarcaAccion } from "@/lib/ventas/auth";
import { actualizarDatosLead, asignarLead, eliminarLeads, getLead, getUsuaria } from "@/lib/ventas/db";
import { esFase, MARCA_DINKBIT_SLUG } from "@/lib/ventas/dominio";
import type { ResultadoAccion } from "@/lib/ventas/resultado";
import type { SeccionMarca } from "@/lib/ventas/rutas";
import {
  anadirNota,
  cambiarFaseManual,
  crearLeadManual,
  importarLeadsCsv,
  marcarMuestrasEnviadas,
  moverLead,
  pasarLeadAlEmbudo,
  previsualizarImportacion,
  registrarLlamada,
  type PreviaImportacion,
  type ResultadoImportacion,
} from "@/lib/ventas/servicios";
import { leerCambioFase, leerDatosLead, leerLlamada, leerNotaSeguimiento } from "@/lib/ventas/validacion";

const NO_ENCONTRADO = { ok: false, error: "Lead no encontrado." } as const;

/** Acceso a la marca de la URL (según el rol) + el lead, que tiene que ser de
 *  esa marca. Una clienta solo pasa en las secciones que ve en su marca. */
async function accesoALead(slug: string, leadId: string, seccion: SeccionMarca = "leads") {
  const acceso = await accesoMarcaAccion(slug, seccion);
  if (!acceso.ok) return acceso;
  const lead = await getLead(leadId);
  if (!lead || lead.marca_id !== acceso.marca.id) return NO_ENCONTRADO;
  return { ...acceso, lead };
}

function refrescar(slug: string) {
  revalidatePath(`/panel/ventas/${slug}`, "layout");
  revalidatePath("/panel/ventas/hoy");
}

export async function previsualizarLeadsAction(
  slug: string,
  csv: string,
): Promise<{ ok: true; previa: PreviaImportacion } | { ok: false; error: string }> {
  const acceso = await accesoMarcaAccion(slug, "leads");
  if (!acceso.ok) return acceso;
  return { ok: true, previa: await previsualizarImportacion({ marca: acceso.marca, csv }) };
}

export async function importarLeadsAction(slug: string, _prev: ResultadoImportacion | null, fd: FormData): Promise<ResultadoImportacion> {
  const acceso = await accesoMarcaAccion(slug, "leads");
  if (!acceso.ok) return { ok: false, error: acceso.error, errores: [] };
  const res = await importarLeadsCsv({
    marca: acceso.marca,
    usuaria: acceso.usuaria,
    csv: String(fd.get("csv") ?? ""),
    nombreFichero: String(fd.get("nombre_fichero") ?? ""),
    nombreLista: String(fd.get("nombre_lista") ?? ""),
  });
  if (res.ok) refrescar(slug);
  return res;
}

export async function crearLeadManualAction(slug: string, _prev: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  const acceso = await accesoMarcaAccion(slug, "leads");
  if (!acceso.ok) return acceso;
  const leido = leerDatosLead(fd);
  if (!leido.ok) return leido;
  const nota = String(fd.get("nota") ?? "").trim().slice(0, 2000);
  const res = await crearLeadManual({ marca: acceso.marca, usuaria: acceso.usuaria, datos: leido.datos, nota });
  if (!res.ok) return res;
  refrescar(slug);
  redirect(`/panel/ventas/${slug}/leads/${res.leadId}`);
}

export async function actualizarLeadAction(slug: string, leadId: string, _prev: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  const acceso = await accesoALead(slug, leadId);
  if (!acceso.ok) return acceso;
  const leido = leerDatosLead(fd);
  if (!leido.ok) return leido;
  const res = await actualizarDatosLead(leadId, leido.datos);
  if (!res.ok) return res;
  refrescar(slug);
  return { ok: true, mensaje: "Datos guardados." };
}

export async function asignarLeadAction(slug: string, leadId: string, usuariaId: string): Promise<ResultadoAccion> {
  const acceso = await accesoALead(slug, leadId);
  if (!acceso.ok) return acceso;
  if (usuariaId) {
    const destino = await getUsuaria(usuariaId);
    if (!destino?.activa) return { ok: false, error: "Esa usuaria no existe o está desactivada." };
  }
  const res = await asignarLead(leadId, usuariaId || null);
  if (!res.ok) return res;
  refrescar(slug);
  return { ok: true, mensaje: "Asignación guardada." };
}

export async function registrarLlamadaAction(slug: string, leadId: string, _prev: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  const acceso = await accesoALead(slug, leadId);
  if (!acceso.ok) return acceso;
  const leido = leerLlamada(fd);
  if (!leido.ok) return leido;
  const res = await registrarLlamada({ usuaria: acceso.usuaria, leadId, llamada: leido.datos });
  if (!res.ok) return res;
  refrescar(slug);
  return { ok: true, mensaje: "Llamada registrada." };
}

export async function muestrasEnviadasAction(slug: string, leadId: string, _prev: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  const acceso = await accesoALead(slug, leadId);
  if (!acceso.ok) return acceso;
  const leido = leerNotaSeguimiento(fd);
  if (!leido.ok) return leido;
  const res = await marcarMuestrasEnviadas({ usuaria: acceso.usuaria, leadId, datos: leido.datos });
  if (!res.ok) return res;
  refrescar(slug);
  return { ok: true, mensaje: "Muestras apuntadas." };
}

export async function notaAction(slug: string, leadId: string, _prev: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  const acceso = await accesoALead(slug, leadId);
  if (!acceso.ok) return acceso;
  const leido = leerNotaSeguimiento(fd);
  if (!leido.ok) return leido;
  const res = await anadirNota({ usuaria: acceso.usuaria, leadId, datos: leido.datos });
  if (!res.ok) return res;
  refrescar(slug);
  return { ok: true, mensaje: "Nota añadida." };
}

export async function cambiarFaseAction(slug: string, leadId: string, _prev: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  const acceso = await accesoALead(slug, leadId);
  if (!acceso.ok) return acceso;
  const leido = leerCambioFase(fd);
  if (!leido.ok) return leido;
  const res = await cambiarFaseManual({ usuaria: acceso.usuaria, leadId, cambio: leido.datos });
  if (!res.ok) return res;
  refrescar(slug);
  return { ok: true, mensaje: "Fase cambiada." };
}

/** Ficha del lead → botón «Pasar al embudo». Solo para la marca `dinkbit`
 *  (leads de WhatsApp): es la única con sentido para promocionar al CRM
 *  principal con `channel: "WhatsApp"`. */
export async function pasarAlEmbudoAction(slug: string, leadId: string, _prev: ResultadoAccion | null, _fd: FormData): Promise<ResultadoAccion> {
  if (slug !== MARCA_DINKBIT_SLUG) return { ok: false, error: "Esta acción solo está disponible para la marca Dinkbit." };
  const acceso = await accesoALead(slug, leadId);
  if (!acceso.ok) return acceso;
  const res = await pasarLeadAlEmbudo({ usuaria: acceso.usuaria, leadId });
  if (res.ok) refrescar(slug);
  return res;
}

/** Tablero: arrastrar una tarjeta o pulsar «→». */
export async function moverLeadAction(slug: string, leadId: string, fase: string): Promise<ResultadoAccion> {
  const acceso = await accesoALead(slug, leadId, "tablero");
  if (!acceso.ok) return acceso;
  if (!esFase(fase)) return { ok: false, error: "Fase no válida." };
  // moverLead vuelve a leer el lead antes de escribir: es a propósito, no un
  // descuido, para achicar la ventana en la que dos movimientos simultáneos
  // podrían duplicarse.
  const res = await moverLead({ usuaria: acceso.usuaria, leadId, fase });
  if (!res.ok) return res;
  refrescar(slug);
  return { ok: true };
}

/** Ficha → «Eliminar lead». Definitivo y solo de admin. */
export async function eliminarLeadAction(slug: string, leadId: string, _prev: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  const acceso = await accesoALead(slug, leadId);
  if (!acceso.ok) return acceso;
  if (acceso.usuaria.rol !== "admin") return { ok: false, error: "Solo una admin puede eliminar leads." };
  const escrito = String(fd.get("confirmacion") ?? "").trim().toLowerCase();
  if (escrito !== acceso.lead.negocio.trim().toLowerCase()) {
    return { ok: false, error: "Escribe el nombre del negocio tal cual para confirmar." };
  }
  const res = await eliminarLeads(acceso.marca.id, [leadId]);
  if (!res.ok) return res;
  if (res.borrados === 0) return NO_ENCONTRADO;
  refrescar(slug);
  redirect(`/panel/ventas/${slug}/leads`);
}
