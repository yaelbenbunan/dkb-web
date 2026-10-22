"use server";

import { revalidatePath } from "next/cache";
import { crearAlta, getAltaPorId, setAltaActiva } from "@/lib/altas/db";
import { generarTokenAlta } from "@/lib/altas/token";
import { requireUsuaria } from "@/lib/ventas/auth";
import type { ResultadoAccion } from "@/lib/ventas/resultado";

const RUTA = "/panel/ventas/altas";
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
