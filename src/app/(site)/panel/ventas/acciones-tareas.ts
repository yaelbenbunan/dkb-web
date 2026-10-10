"use server";

import { revalidatePath } from "next/cache";
import { accesoMarcaAccion } from "@/lib/ventas/auth";
import { actualizarTarea, crearTarea, getLead, getTarea, getUsuaria } from "@/lib/ventas/db";
import type { ResultadoAccion } from "@/lib/ventas/resultado";
import { esAsignableEnMarca } from "@/lib/ventas/rutas";
import { leerNuevaTarea } from "@/lib/ventas/validacion";

const TAREA_NO_ENCONTRADA = { ok: false, error: "Tarea no encontrada." } as const;
const USUARIA_NO_VALIDA = { ok: false, error: "Esa usuaria no existe o está desactivada." } as const;

function refrescar(slug: string) {
  revalidatePath(`/panel/ventas/${slug}/tareas`);
  revalidatePath("/panel/ventas/hoy");
}

async function responsableValida(usuariaId: string | null, marcaId: string): Promise<boolean> {
  if (!usuariaId) return true;
  const destino = await getUsuaria(usuariaId);
  return !!destino && esAsignableEnMarca(destino, marcaId);
}

/** Acceso a la sección de tareas + la tarea, que tiene que ser de la marca de la URL. */
async function accesoATarea(slug: string, tareaId: string) {
  const acceso = await accesoMarcaAccion(slug, "tareas");
  if (!acceso.ok) return acceso;
  const tarea = await getTarea(tareaId);
  if (!tarea || tarea.marca_id !== acceso.marca.id) return TAREA_NO_ENCONTRADA;
  return { ...acceso, tarea };
}

export async function crearTareaAction(slug: string, _prev: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  const acceso = await accesoMarcaAccion(slug, "tareas");
  if (!acceso.ok) return acceso;
  const leido = leerNuevaTarea(fd);
  if (!leido.ok) return leido;
  const d = leido.datos;
  if (!(await responsableValida(d.asignada_a, acceso.marca.id))) return USUARIA_NO_VALIDA;
  if (d.lead_id) {
    const lead = await getLead(d.lead_id);
    if (!lead || lead.marca_id !== acceso.marca.id) return { ok: false, error: "Lead no encontrado." };
  }
  const res = await crearTarea({
    marcaId: acceso.marca.id,
    leadId: d.lead_id,
    titulo: d.titulo,
    vence: d.vence,
    venceHora: d.vence_hora,
    asignadaA: d.asignada_a,
    creadaPor: acceso.usuaria.id,
  });
  if (!res.ok) return res;
  refrescar(slug);
  return { ok: true, mensaje: "Tarea creada." };
}

export async function marcarTareaAction(slug: string, tareaId: string, hecha: boolean): Promise<ResultadoAccion> {
  const acceso = await accesoATarea(slug, tareaId);
  if (!acceso.ok) return acceso;
  const res = await actualizarTarea(tareaId, { hecha: hecha ? { por: acceso.usuaria.id } : null });
  if (!res.ok) return res;
  refrescar(slug);
  return { ok: true };
}

export async function reasignarTareaAction(slug: string, tareaId: string, usuariaId: string): Promise<ResultadoAccion> {
  const acceso = await accesoATarea(slug, tareaId);
  if (!acceso.ok) return acceso;
  if (!(await responsableValida(usuariaId || null, acceso.marca.id))) return USUARIA_NO_VALIDA;
  const res = await actualizarTarea(tareaId, { asignadaA: usuariaId || null });
  if (!res.ok) return res;
  refrescar(slug);
  return { ok: true };
}
