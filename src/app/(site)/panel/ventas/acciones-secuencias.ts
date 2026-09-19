"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUsuaria } from "@/lib/ventas/auth";
import { actualizarSecuencia, crearSecuencia, getMarcaPorSlug, getSecuencia } from "@/lib/ventas/db";
import type { ResultadoAccion } from "@/lib/ventas/resultado";
import { secuenciaVacia } from "@/lib/ventas/secuencias";
import { activarSecuencia, duplicarSecuencia, guardarSecuencia } from "@/lib/ventas/servicios";

const MARCA_NO_ENCONTRADA = { ok: false, error: "Marca no encontrada." } as const;
const SECUENCIA_NO_ENCONTRADA = { ok: false, error: "Secuencia no encontrada." } as const;

function refrescar(slug: string, secuenciaId?: string) {
  revalidatePath(`/panel/ventas/${slug}/secuencias`);
  if (secuenciaId) revalidatePath(`/panel/ventas/${slug}/secuencias/${secuenciaId}`);
}

function leerNombre(fd: FormData): { ok: true; nombre: string } | { ok: false; error: string } {
  const nombre = String(fd.get("nombre") ?? "").trim();
  if (!nombre) return { ok: false, error: "Ponle nombre a la secuencia." };
  if (nombre.length > 120) return { ok: false, error: "Nombre demasiado largo." };
  return { ok: true, nombre };
}

/** Crea una secuencia vacía (Task 2: `secuenciaVacia()`) y abre el editor. Solo admin. */
export async function crearSecuenciaAction(slug: string, _prev: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  const usuaria = await requireUsuaria("admin");
  const marca = await getMarcaPorSlug(slug);
  if (!marca) return MARCA_NO_ENCONTRADA;
  const leido = leerNombre(fd);
  if (!leido.ok) return leido;
  const res = await crearSecuencia({ marcaId: marca.id, nombre: leido.nombre, pasos: secuenciaVacia(), creadaPor: usuaria.id });
  if (!res.ok) return res;
  refrescar(slug, res.id);
  redirect(`/panel/ventas/${slug}/secuencias/${res.id}`);
}

/**
 * Guarda el editor de una secuencia. El formulario manda los pasos como JSON
 * en un campo oculto: se parsea y se valida aquí, en el servidor —nunca se
 * confía en lo que mande el cliente. Solo admin.
 */
export async function guardarSecuenciaAction(
  slug: string,
  secuenciaId: string,
  _prev: ResultadoAccion | null,
  fd: FormData,
): Promise<ResultadoAccion> {
  const usuaria = await requireUsuaria("admin");
  const marca = await getMarcaPorSlug(slug);
  if (!marca) return MARCA_NO_ENCONTRADA;

  let pasosJson: unknown;
  try {
    pasosJson = JSON.parse(String(fd.get("pasos") ?? ""));
  } catch {
    return { ok: false, error: "El formulario no tiene un JSON válido: recarga la página e inténtalo de nuevo." };
  }

  const res = await guardarSecuencia({ marca, usuaria, secuenciaId, nombre: String(fd.get("nombre") ?? ""), pasosJson });
  if (!res.ok) return res;
  refrescar(slug, secuenciaId);
  return { ok: true, mensaje: "Secuencia guardada." };
}

/** Solo admin. Falla si la secuencia tiene avisos graves; archiva las demás activas de la marca. */
export async function activarSecuenciaAction(slug: string, secuenciaId: string): Promise<ResultadoAccion> {
  await requireUsuaria("admin");
  const marca = await getMarcaPorSlug(slug);
  if (!marca) return MARCA_NO_ENCONTRADA;
  const res = await activarSecuencia({ marca, secuenciaId });
  if (!res.ok) return res;
  refrescar(slug, secuenciaId);
  return { ok: true, mensaje: "Secuencia activada." };
}

/** Solo admin. */
export async function archivarSecuenciaAction(slug: string, secuenciaId: string): Promise<ResultadoAccion> {
  await requireUsuaria("admin");
  const marca = await getMarcaPorSlug(slug);
  if (!marca) return MARCA_NO_ENCONTRADA;
  const secuencia = await getSecuencia(secuenciaId);
  if (!secuencia || secuencia.marca_id !== marca.id) return SECUENCIA_NO_ENCONTRADA;
  const res = await actualizarSecuencia(secuenciaId, { estado: "archivada" });
  if (!res.ok) return res;
  refrescar(slug, secuenciaId);
  return { ok: true, mensaje: "Secuencia archivada." };
}

/** Copia los pasos con un nombre nuevo y abre el editor de la copia. Solo admin. */
export async function duplicarSecuenciaAction(
  slug: string,
  secuenciaId: string,
  _prev: ResultadoAccion | null,
  fd: FormData,
): Promise<ResultadoAccion> {
  const usuaria = await requireUsuaria("admin");
  const marca = await getMarcaPorSlug(slug);
  if (!marca) return MARCA_NO_ENCONTRADA;
  const leido = leerNombre(fd);
  if (!leido.ok) return leido;
  const res = await duplicarSecuencia({ marca, usuaria, secuenciaId, nombre: leido.nombre });
  if (!res.ok) return res;
  refrescar(slug, res.id);
  redirect(`/panel/ventas/${slug}/secuencias/${res.id}`);
}
