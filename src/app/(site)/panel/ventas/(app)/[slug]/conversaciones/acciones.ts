"use server";

import { revalidatePath } from "next/cache";
import { requireUsuaria } from "@/lib/ventas/auth";
import { getMarcaPorSlug } from "@/lib/ventas/db";
import type { ResultadoAccion } from "@/lib/ventas/resultado";
import { guardarSaliente, listConversaciones } from "@/lib/whatsapp/db";
import { crearMensajero } from "@/lib/whatsapp/mensajero";
import { ventanaAbierta } from "@/lib/whatsapp/ventana";

const LARGO_MAXIMO = 1024;

/**
 * Responde a una conversación de WhatsApp desde la bandeja.
 *
 * `db.ts` no expone un `getConversacionPorId`: solo `listConversaciones(marcaId)`.
 * Por eso el `slug` va delante, igual que en el resto de acciones del panel
 * (`leadDeMarca` en `acciones-leads.ts`): sirve para resolver la marca y, con
 * ella, encontrar la conversación real en Supabase y comprobar que es suya.
 * Esa comprobación —y la de la ventana— se hace SIEMPRE con lo que dice la
 * base de datos, nunca con lo que mande el formulario: deshabilitar el campo
 * en el navegador no es una barrera, es solo una ayuda visual.
 */
export async function responder(slug: string, conversacionId: string, texto: string): Promise<ResultadoAccion> {
  await requireUsuaria();

  const limpio = texto.trim();
  if (!limpio) return { ok: false, error: "Escribe algo antes de enviar." };
  if (limpio.length > LARGO_MAXIMO) return { ok: false, error: `El mensaje no puede pasar de ${LARGO_MAXIMO} caracteres.` };

  const marca = await getMarcaPorSlug(slug);
  if (!marca) return { ok: false, error: "Marca no encontrada." };

  const conversaciones = await listConversaciones(marca.id);
  const conversacion = conversaciones.find((c) => c.id === conversacionId);
  if (!conversacion) return { ok: false, error: "Conversación no encontrada." };

  if (!ventanaAbierta(conversacion.ventana_hasta, new Date())) {
    return { ok: false, error: "La ventana de 24 h está cerrada: hace falta una plantilla aprobada." };
  }

  const mensajero = crearMensajero();
  const resultado = await mensajero.enviarTexto(conversacion.wa_id, limpio);

  if (resultado.ok) {
    await guardarSaliente({ conversacionId, wamid: resultado.wamid, texto: limpio });
    revalidatePath(`/panel/ventas/${slug}/conversaciones`);
    return { ok: true };
  }

  await guardarSaliente({ conversacionId, wamid: null, texto: limpio, error: resultado.error });
  revalidatePath(`/panel/ventas/${slug}/conversaciones`);
  return { ok: false, error: resultado.error };
}
