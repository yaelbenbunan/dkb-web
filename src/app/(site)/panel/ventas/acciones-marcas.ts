"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUsuaria } from "@/lib/ventas/auth";
import { actualizarCondiciones, borrarExclusion, crearExclusion, crearMarca, regenerarSecretoWebhook } from "@/lib/ventas/db";
import type { ResultadoAccion } from "@/lib/ventas/resultado";
import { leerCondiciones, leerExclusion, leerNuevaMarca } from "@/lib/ventas/validacion";

function refrescar() {
  revalidatePath("/panel/ventas", "layout");
}

export async function crearMarcaAction(_prev: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  await requireUsuaria("admin");
  const leido = leerNuevaMarca(fd);
  if (!leido.ok) return leido;
  const res = await crearMarca(leido.datos);
  if (!res.ok) return res;
  refrescar();
  redirect(`/panel/ventas/${res.marca.slug}/condiciones`);
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
