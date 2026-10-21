"use server";

import { revalidatePath } from "next/cache";
import { accesoMarcaAccion } from "@/lib/ventas/auth";
import type { ResultadoAccion } from "@/lib/ventas/resultado";
import { actualizarConversacion, getConversacionPorId, guardarSaliente } from "@/lib/whatsapp/db";
import { mensajeroDeMarca } from "@/lib/whatsapp/numeros";
import { ventanaAbierta } from "@/lib/whatsapp/ventana";

const LARGO_MAXIMO = 1024;

/**
 * Responde a una conversación de WhatsApp desde la bandeja.
 *
 * El `slug` va delante, igual que en el resto de acciones del panel
 * (`accesoALead` en `acciones-leads.ts`): sirve para resolver la marca y, con
 * ella, comprobar que la conversación es suya. Esa comprobación —y la de la
 * ventana— se hace SIEMPRE con lo que dice la base de datos (`getConversacionPorId`,
 * una búsqueda puntual, no un escaneo de las hasta 500 conversaciones de la
 * marca), nunca con lo que mande el formulario: deshabilitar el campo en el
 * navegador no es una barrera, es solo una ayuda visual.
 */
export async function responder(slug: string, conversacionId: string, texto: string): Promise<ResultadoAccion> {
  // Primero el permiso: una clienta no llega a la bandeja ni llamando a mano.
  const acceso = await accesoMarcaAccion(slug, "conversaciones");
  if (!acceso.ok) return acceso;
  const marca = acceso.marca;

  const limpio = texto.trim();
  if (!limpio) return { ok: false, error: "Escribe algo antes de enviar." };
  if (limpio.length > LARGO_MAXIMO) return { ok: false, error: `El mensaje no puede pasar de ${LARGO_MAXIMO} caracteres.` };

  const conversacion = await getConversacionPorId(conversacionId);
  if (!conversacion || conversacion.marca_id !== marca.id) return { ok: false, error: "Conversación no encontrada." };

  if (!ventanaAbierta(conversacion.ventana_hasta, new Date())) {
    return { ok: false, error: "La ventana de 24 h está cerrada: hace falta una plantilla aprobada." };
  }

  // Siempre el número de la marca de la conversación. Si no se puede leer (error
  // de base de datos) no se cae a otro número: sería contestar desde la marca
  // equivocada.
  let mensajero;
  try {
    mensajero = await mensajeroDeMarca(acceso.marca);
  } catch (e) {
    console.error("[conversaciones] no se pudo obtener el mensajero de la marca", marca.id, e);
    return { ok: false, error: "No se pudo enviar. Vuelve a intentarlo." };
  }

  // Si contesta una persona, el bot se calla: si no, el siguiente mensaje del
  // cliente lo seguiría atendiendo el guion por encima de la comercial. Se
  // para ANTES de enviar; si no se puede, no se envía (mejor un reintento que
  // un cliente con dos interlocutores).
  if (conversacion.estado === "bot" || conversacion.paso_actual) {
    try {
      await actualizarConversacion(conversacion.id, { estado: "humana", pasoActual: null });
    } catch (e) {
      console.error("[conversaciones] no se pudo pasar la conversación a humana", conversacionId, e);
      return { ok: false, error: "No se pudo enviar. Vuelve a intentarlo." };
    }
  }

  const resultado = await mensajero.enviarTexto(conversacion.wa_id, limpio);
  revalidatePath(`/panel/ventas/${slug}/conversaciones`);

  if (resultado.ok) {
    // El mensaje YA llegó al cliente por WhatsApp en este punto. Si guardarlo
    // revienta (un hipo de Supabase, `guardarSaliente` lanza), NUNCA se debe
    // devolver un error: eso es justo lo que llevaría a la comercial a pulsar
    // «Enviar» otra vez y mandarlo DOS VECES a un cliente real. Se registra
    // el fallo y se avisa sin alarmar — el envío en sí fue bien.
    try {
      await guardarSaliente({ conversacionId, wamid: resultado.wamid, texto: limpio, origen: "panel" });
      return { ok: true };
    } catch (e) {
      console.error("[conversaciones] el mensaje se envió pero no se pudo registrar", conversacionId, e);
      return { ok: true, mensaje: "Enviado. No se pudo guardar en el historial: recarga la página para comprobarlo." };
    }
  }

  // Aquí el envío falló de verdad (no hay riesgo de duplicado): guardar el
  // fallo es solo para que quede constancia en la bandeja, así que si eso
  // también falla, basta con registrarlo — el error real que interesa a la
  // comercial es el del envío, que ya se devuelve.
  try {
    await guardarSaliente({ conversacionId, wamid: null, texto: limpio, error: resultado.error, origen: "panel" });
  } catch (e) {
    console.error("[conversaciones] no se pudo registrar el envío fallido", conversacionId, e);
  }
  return { ok: false, error: resultado.error };
}
