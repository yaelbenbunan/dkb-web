"use server";

import { revalidatePath } from "next/cache";
import { accesoMarcaAccion } from "@/lib/ventas/auth";
import type { ResultadoAccion } from "@/lib/ventas/resultado";
import { puedeConectarWhatsApp } from "@/lib/ventas/rutas";
import { conectarNumero } from "@/lib/whatsapp/conexion";

const soloDigitos = (v: unknown): v is string => typeof v === "string" && /^\d+$/.test(v);

/**
 * Conecta el número que el negocio eligió en la ventana de Meta a la marca de
 * la URL. La marca sale SIEMPRE del slug y del permiso, nunca de lo que mande
 * el navegador; lo que manda (code, WABA, número) se valida como texto.
 */
export async function conectarWhatsAppAction(
  slug: string,
  datos: { code: string; wabaId: string; numeroId: string | null },
): Promise<ResultadoAccion> {
  const acceso = await accesoMarcaAccion(slug, "whatsapp");
  if (!acceso.ok) return acceso;
  // La comercial ve la sección pero no conecta: el permiso de sección no basta.
  if (!puedeConectarWhatsApp(acceso.usuaria, acceso.marca.id)) return { ok: false, error: "No tienes permiso para esto." };

  const { code, wabaId, numeroId } = datos ?? {};
  if (typeof code !== "string" || !code.trim()) return { ok: false, error: "Falta el código de Meta: vuelve a intentarlo." };
  if (!soloDigitos(wabaId)) return { ok: false, error: "La cuenta de WhatsApp que devolvió Meta no es válida." };
  if (numeroId !== null && !soloDigitos(numeroId)) return { ok: false, error: "El número que devolvió Meta no es válido." };

  const resultado = await conectarNumero({ marcaId: acceso.marca.id, code: code.trim(), wabaId, numeroId });
  revalidatePath(`/panel/ventas/${slug}/whatsapp`);
  return resultado;
}
