"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { crearAlta, getAltaPorId, setAltaActiva, vincularAltaMarca } from "@/lib/altas/db";
import { generarTokenAlta } from "@/lib/altas/token";
import { requireUsuaria } from "@/lib/ventas/auth";
import { crearMarca, getMarcaPorId, listMarcas } from "@/lib/ventas/db";
import type { ResultadoAccion } from "@/lib/ventas/resultado";
import { slugLibre } from "@/lib/ventas/validacion";
import { anclarAlCrear } from "@/lib/ventas/anclaje";

const RUTA = "/panel/altas";
const MAX_CLIENTE = 120;

export async function crearAltaAction(_prev: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  const admin = await requireUsuaria("admin");
  const cliente = String(fd.get("cliente") ?? "").replace(/\s+/g, " ").trim();
  if (!cliente) return { ok: false, error: "Escribe el nombre del cliente." };
  if (cliente.length > MAX_CLIENTE) return { ok: false, error: `El nombre del cliente es demasiado largo (máximo ${MAX_CLIENTE} caracteres).` };
  const res = await crearAlta({ cliente, token: generarTokenAlta(), creadaPor: admin.id });
  if (!res.ok) return res;
  revalidatePath(RUTA);
  return { ok: true, mensaje: `Alta creada para ${cliente}. Copia su enlace en la lista y envíaselo.` };
}

export async function setAltaActivaAction(id: string, activa: boolean): Promise<ResultadoAccion> {
  await requireUsuaria("admin");
  // Las server actions se pueden llamar a mano: no te fíes del tipo.
  if (typeof activa !== "boolean") return { ok: false, error: "Valor no válido." };
  if (!(await getAltaPorId(id))) return { ok: false, error: "Alta no encontrada." };
  const res = await setAltaActiva(id, activa);
  if (!res.ok) return res;
  revalidatePath(RUTA);
  revalidatePath(`${RUTA}/${id}`);
  return { ok: true, mensaje: activa ? "Enlace reactivado." : "Enlace desactivado: el cliente ya no puede abrirlo." };
}

/**
 * «Crear ficha de cliente» desde un alta enviada: crea el cliente con el
 * nombre del alta, los une y abre su ficha, donde ya sale todo lo que rellenó.
 */
export async function crearFichaDesdeAltaAction(altaId: string): Promise<ResultadoAccion> {
  const admin = await requireUsuaria("admin");
  const alta = await getAltaPorId(altaId);
  if (!alta) return { ok: false, error: "Alta no encontrada." };
  if (!alta.enviada_en) return { ok: false, error: "El cliente aún no ha enviado el formulario." };
  // Sin la columna, la fila no trae `marca_id`: mejor avisar antes de crear un cliente que no se podría unir.
  if (!("marca_id" in alta)) return { ok: false, error: "Falta ejecutar en Supabase docs/sql/2026-11-18-panel-fichas-clientes.sql." };
  if (alta.marca_id) return { ok: false, error: "Esta alta ya tiene ficha de cliente." };

  const nombre = alta.cliente.slice(0, 80);
  const slug = slugLibre(nombre, (await listMarcas()).map((m) => m.slug));
  const creada = await crearMarca({ nombre, slug });
  if (!creada.ok) return creada;
  const unida = await vincularAltaMarca(alta.id, creada.marca.id);
  if (!unida.ok) return { ok: false, error: `Se creó el cliente «${nombre}», pero no se pudo unir al alta: ${unida.error}` };
  await anclarAlCrear(admin, creada.marca.id);
  revalidatePath("/panel", "layout");
  redirect(`/panel/${creada.marca.slug}/ficha`);
}

/** Une un alta ya enviada a un cliente que existía antes (sin pasar por «Crear ficha»). */
export async function vincularAltaAction(marcaId: string, altaId: string): Promise<ResultadoAccion> {
  await requireUsuaria("admin");
  const [alta, marca] = await Promise.all([getAltaPorId(altaId), typeof marcaId === "string" ? getMarcaPorId(marcaId) : null]);
  if (!alta || !marca) return { ok: false, error: "Alta o cliente no encontrado." };
  if (!alta.enviada_en) return { ok: false, error: "El cliente aún no ha enviado ese formulario." };
  const res = await vincularAltaMarca(alta.id, marca.id);
  if (!res.ok) return res;
  revalidatePath(`/panel/${marca.slug}/ficha`);
  revalidatePath(RUTA);
  return { ok: true, mensaje: "Alta unida a la ficha." };
}
