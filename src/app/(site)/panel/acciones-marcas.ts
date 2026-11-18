"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUsuaria } from "@/lib/ventas/auth";
import {
  actualizarCondiciones,
  borrarExclusion,
  crearExclusion,
  crearMarca,
  getMarcaPorId,
  regenerarSecretoWebhook,
  setClientesAnclados,
  setServiciosMarca,
} from "@/lib/ventas/db";
import { anclarAlCrear } from "@/lib/ventas/anclaje";
import { alternarAnclado } from "@/lib/ventas/espacios";
import { limpiarServicios } from "@/lib/ventas/proyectos";
import type { ResultadoAccion } from "@/lib/ventas/resultado";
import { leerCondiciones, leerExclusion, leerNuevaMarca } from "@/lib/ventas/validacion";

function refrescar() {
  revalidatePath("/panel", "layout");
}

export async function crearMarcaAction(_prev: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  const admin = await requireUsuaria("admin");
  const leido = leerNuevaMarca(fd);
  if (!leido.ok) return leido;
  const res = await crearMarca(leido.datos);
  if (!res.ok) return res;
  await anclarAlCrear(admin, res.marca.id);
  refrescar();
  redirect(`/panel/${res.marca.slug}/ficha`);
}

/** Anclar o soltar un cliente en el menú lateral de quien lo pide. */
export async function alternarAncladoAction(marcaId: string): Promise<ResultadoAccion> {
  const usuaria = await requireUsuaria("equipo");
  if (typeof marcaId !== "string" || !(await getMarcaPorId(marcaId))) return { ok: false, error: "Cliente no encontrado." };
  if (!Array.isArray(usuaria.clientes_anclados)) {
    return { ok: false, error: "Para anclar clientes falta ejecutar en Supabase docs/sql/2026-11-18-panel-fichas-clientes.sql." };
  }
  const res = await setClientesAnclados(usuaria.id, alternarAnclado(usuaria.clientes_anclados, marcaId));
  if (!res.ok) return res;
  refrescar();
  return { ok: true };
}

/** Los servicios contratados, desde la ficha del cliente. */
export async function guardarServiciosAction(marcaId: string, servicios: unknown): Promise<ResultadoAccion> {
  await requireUsuaria("equipo");
  if (!Array.isArray(servicios)) return { ok: false, error: "Valor no válido." };
  const marca = typeof marcaId === "string" ? await getMarcaPorId(marcaId) : null;
  if (!marca) return { ok: false, error: "Cliente no encontrado." };
  const res = await setServiciosMarca(marca.id, limpiarServicios(servicios));
  if (!res.ok) return res;
  refrescar();
  return { ok: true, mensaje: "Servicios guardados." };
}

export async function actualizarCondicionesAction(marcaId: string, _prev: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  await requireUsuaria("admin");
  const leido = leerCondiciones(fd);
  if (!leido.ok) return leido;
  const res = await actualizarCondiciones(marcaId, leido.datos);
  if (!res.ok) return res;
  refrescar();
  return { ok: true, mensaje: "Condiciones guardadas." };
}

export async function crearExclusionAction(marcaId: string, _prev: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  const admin = await requireUsuaria("admin");
  const leido = leerExclusion(fd);
  if (!leido.ok) return leido;
  const res = await crearExclusion(marcaId, leido.datos, admin.id);
  if (!res.ok) return res;
  refrescar();
  return { ok: true, mensaje: "Añadido a la lista de exclusión." };
}

export async function borrarExclusionAction(marcaId: string, exclusionId: string): Promise<ResultadoAccion> {
  await requireUsuaria("admin");
  const res = await borrarExclusion(exclusionId, marcaId);
  if (!res.ok) return res;
  refrescar();
  return { ok: true };
}

export async function regenerarSecretoAction(marcaId: string): Promise<ResultadoAccion> {
  await requireUsuaria("admin");
  const res = await regenerarSecretoWebhook(marcaId);
  if (!res.ok) return res;
  refrescar();
  return { ok: true, mensaje: "Secreto nuevo generado. Actualízalo en Zapier: el anterior ya no funciona." };
}
