"use server";

import { revalidatePath } from "next/cache";
import { requireUsuaria } from "@/lib/ventas/auth";
import { crearUsuariaCompleta, getUsuaria, setPasswordUsuaria, setUsuariaActiva } from "@/lib/ventas/db";
import type { ResultadoAccion } from "@/lib/ventas/resultado";
import { leerNuevaUsuaria, leerPassword } from "@/lib/ventas/validacion";

const RUTA = "/panel/ventas/usuarias";
const NO_ENCONTRADA = { ok: false, error: "Usuaria no encontrada." } as const;

export async function crearUsuariaAction(_prev: ResultadoAccion | null, fd: FormData): Promise<ResultadoAccion> {
  await requireUsuaria("admin");
  const leido = leerNuevaUsuaria(fd);
  if (!leido.ok) return leido;
  const res = await crearUsuariaCompleta(leido.datos);
  if (!res.ok) return res;
  revalidatePath(RUTA);
  return { ok: true, mensaje: `Cuenta creada para ${leido.datos.email}. Pásale la contraseña por un canal privado.` };
}

export async function setUsuariaActivaAction(id: string, activa: boolean): Promise<ResultadoAccion> {
  const admin = await requireUsuaria("admin");
  // Las server actions se pueden llamar a mano: no te fíes del tipo.
  if (typeof activa !== "boolean") return { ok: false, error: "Valor de acceso no válido." };
  if (id === admin.id && !activa) return { ok: false, error: "No puedes desactivar tu propia cuenta." };
  if (!(await getUsuaria(id))) return NO_ENCONTRADA;
  const res = await setUsuariaActiva(id, activa);
  if (!res.ok) return res;
  revalidatePath(RUTA);
  return { ok: true, mensaje: activa ? "Acceso reactivado." : "Acceso desactivado." };
}

export async function cambiarPasswordAction(id: string, password: string): Promise<ResultadoAccion> {
  await requireUsuaria("admin");
  const leido = leerPassword(password);
  if (!leido.ok) return leido;
  if (!(await getUsuaria(id))) return NO_ENCONTRADA;
  const res = await setPasswordUsuaria(id, leido.datos);
  return res.ok ? { ok: true, mensaje: "Contraseña cambiada." } : res;
}
