"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUsuaria } from "@/lib/ventas/auth";
import { actualizarDatosLead, asignarLead, getLead, getMarcaPorSlug, getUsuaria, type Lead } from "@/lib/ventas/db";
import { esFase, MARCA_DINKBIT_SLUG } from "@/lib/ventas/dominio";
import type { ResultadoAccion } from "@/lib/ventas/resultado";
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

/** El lead existe y es de la marca de la URL. */
async function leadDeMarca(slug: string, leadId: string): Promise<Lead | null> {
  const [marca, lead] = await Promise.all([getMarcaPorSlug(slug), getLead(leadId)]);
  return marca && lead && lead.marca_id === marca.id ? lead : null;
}

function refrescar(slug: string) {
  revalidatePath(`/panel/ventas/${slug}`, "layout");
  revalidatePath("/panel/ventas/hoy");
}

export async function previsualizarLeadsAction(
  slug: string,
  csv: string,
): Promise<{ ok: true; previa: PreviaImportacion } | { ok: false; error: string }> {
  await requireUsuaria();
  const marca = await getMarcaPorSlug(slug);
  if (!marca) return { ok: false, error: "Marca no encontrada." };
  return { ok: true, previa: await previsualizarImportacion({ marca, csv }) };
}

export async function importarLeadsAction(slug: string, _prev: ResultadoImportacion | null, fd: FormData): Promise<ResultadoImportacion> {
  const usuaria = await requireUsuaria();
  const marca = await getMarcaPorSlug(slug);
  if (!marca) return { ok: false, error: "Marca no encontrada.", errores: [] };
  const res = await importarLeadsCsv({
    marca,
    usuaria,
    csv: String(fd.get("csv") ?? ""),
    nombreFichero: String(fd.get("nombre_fichero") ?? ""),
    nombreLista: String(fd.get("nombre_lista") ?? ""),
  });
  if (res.ok) refrescar(slug);
  return res;
}

export async function crearLeadManualAction(slug: string, _prev: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  const usuaria = await requireUsuaria();
  const marca = await getMarcaPorSlug(slug);
  if (!marca) return { ok: false, error: "Marca no encontrada." };
  const leido = leerDatosLead(fd);
  if (!leido.ok) return leido;
  const res = await crearLeadManual({ marca, usuaria, datos: leido.datos });
  if (!res.ok) return res;
  refrescar(slug);
  redirect(`/panel/ventas/${slug}/leads/${res.leadId}`);
}

export async function actualizarLeadAction(slug: string, leadId: string, _prev: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  await requireUsuaria();
  if (!(await leadDeMarca(slug, leadId))) return NO_ENCONTRADO;
  const leido = leerDatosLead(fd);
  if (!leido.ok) return leido;
  const res = await actualizarDatosLead(leadId, leido.datos);
  if (!res.ok) return res;
  refrescar(slug);
  return { ok: true, mensaje: "Datos guardados." };
}

export async function asignarLeadAction(slug: string, leadId: string, usuariaId: string): Promise<ResultadoAccion> {
  await requireUsuaria();
  if (!(await leadDeMarca(slug, leadId))) return NO_ENCONTRADO;
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
  const usuaria = await requireUsuaria();
  if (!(await leadDeMarca(slug, leadId))) return NO_ENCONTRADO;
  const leido = leerLlamada(fd);
  if (!leido.ok) return leido;
  const res = await registrarLlamada({ usuaria, leadId, llamada: leido.datos });
  if (!res.ok) return res;
  refrescar(slug);
  return { ok: true, mensaje: "Llamada registrada." };
}

export async function muestrasEnviadasAction(slug: string, leadId: string, _prev: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  const usuaria = await requireUsuaria();
  if (!(await leadDeMarca(slug, leadId))) return NO_ENCONTRADO;
  const leido = leerNotaSeguimiento(fd);
  if (!leido.ok) return leido;
  const res = await marcarMuestrasEnviadas({ usuaria, leadId, datos: leido.datos });
  if (!res.ok) return res;
  refrescar(slug);
  return { ok: true, mensaje: "Muestras apuntadas." };
}

export async function notaAction(slug: string, leadId: string, _prev: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  const usuaria = await requireUsuaria();
  if (!(await leadDeMarca(slug, leadId))) return NO_ENCONTRADO;
  const leido = leerNotaSeguimiento(fd);
  if (!leido.ok) return leido;
  const res = await anadirNota({ usuaria, leadId, datos: leido.datos });
  if (!res.ok) return res;
  refrescar(slug);
  return { ok: true, mensaje: "Nota añadida." };
}

export async function cambiarFaseAction(slug: string, leadId: string, _prev: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  const usuaria = await requireUsuaria();
  if (!(await leadDeMarca(slug, leadId))) return NO_ENCONTRADO;
  const leido = leerCambioFase(fd);
  if (!leido.ok) return leido;
  const res = await cambiarFaseManual({ usuaria, leadId, cambio: leido.datos });
  if (!res.ok) return res;
  refrescar(slug);
  return { ok: true, mensaje: "Fase cambiada." };
}

/** Ficha del lead → botón «Pasar al embudo». Solo para la marca `dinkbit`
 *  (leads de WhatsApp): es la única con sentido para promocionar al CRM
 *  principal con `channel: "WhatsApp"`. */
export async function pasarAlEmbudoAction(slug: string, leadId: string, _prev: ResultadoAccion | null, _fd: FormData): Promise<ResultadoAccion> {
  const usuaria = await requireUsuaria();
  if (slug !== MARCA_DINKBIT_SLUG) return { ok: false, error: "Esta acción solo está disponible para la marca Dinkbit." };
  if (!(await leadDeMarca(slug, leadId))) return NO_ENCONTRADO;
  const res = await pasarLeadAlEmbudo({ usuaria, leadId });
  if (res.ok) refrescar(slug);
  return res;
}

/** Tablero: arrastrar una tarjeta o pulsar «→». */
export async function moverLeadAction(slug: string, leadId: string, fase: string): Promise<ResultadoAccion> {
  const usuaria = await requireUsuaria();
  if (!(await leadDeMarca(slug, leadId))) return NO_ENCONTRADO;
  if (!esFase(fase)) return { ok: false, error: "Fase no válida." };
  // moverLead vuelve a leer el lead antes de escribir: es a propósito, no un
  // descuido, para achicar la ventana en la que dos movimientos simultáneos
  // podrían duplicarse.
  const res = await moverLead({ usuaria, leadId, fase });
  if (!res.ok) return res;
  refrescar(slug);
  return { ok: true };
}
