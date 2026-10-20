// Lectura de los avisos que la ventana de Embedded Signup de Meta manda por
// postMessage. Puro: lo usa el botón «Conectar WhatsApp» del navegador.

const ORIGENES_META = ["https://www.facebook.com", "https://web.facebook.com"];
const FINALES = ["FINISH", "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING"];
const CANCELACIONES = ["CANCEL", "ERROR"];

export type EventoRegistro = { wabaId: string; numeroId: string | null } | "cancelado" | null;

const digitos = (v: unknown): string | null => (typeof v === "string" && /^\d+$/.test(v) ? v : null);

/**
 * La cuenta (WABA) y el número que eligió el negocio, «cancelado» si cerró la
 * ventana o Meta dio error, o null si el mensaje no es de Embedded Signup (la
 * página recibe también los de otros scripts y extensiones).
 */
export function leerEventoRegistro(evento: { origin: string; data: unknown }): EventoRegistro {
  // Comparación exacta: un dominio que solo empiece igual no es Meta.
  if (!ORIGENES_META.includes(evento.origin)) return null;
  let datos: unknown = evento.data;
  if (typeof datos === "string") {
    try {
      datos = JSON.parse(datos);
    } catch {
      return null;
    }
  }
  if (!datos || typeof datos !== "object") return null;
  const { type, event, data } = datos as { type?: unknown; event?: unknown; data?: unknown };
  if (type !== "WA_EMBEDDED_SIGNUP" || typeof event !== "string") return null;
  if (CANCELACIONES.includes(event)) return "cancelado";
  if (!FINALES.includes(event) || !data || typeof data !== "object") return null;

  const { waba_id, phone_number_id } = data as { waba_id?: unknown; phone_number_id?: unknown };
  const wabaId = digitos(waba_id);
  if (!wabaId) return null;
  // En coexistencia Meta puede no mandar el número: el servidor lo busca en la WABA.
  return { wabaId, numeroId: digitos(phone_number_id) };
}
