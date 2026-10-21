import type { Mensaje } from "./db";
import { telefonoDeWaId, ventanaAbierta } from "./ventana";

const LARGO_EXTRACTO = 80;

/**
 * Recorta un texto a 80 caracteres para la lista de conversaciones: busca el
 * último espacio dentro del límite y corta ahí, para no partir una palabra
 * por la mitad. Si no hay ningún espacio en los primeros 80 caracteres (una
 * URL larga, por ejemplo) no hay palabra que respetar, así que corta en seco
 * a los 80. Los mensajes de imagen o audio no traen texto (`null`), así que
 * se describen en su lugar.
 */
export function extracto(texto: string | null): string {
  if (!texto) return "(sin texto)";
  if (texto.length <= LARGO_EXTRACTO) return texto;

  const corte = texto.slice(0, LARGO_EXTRACTO);
  const ultimoEspacio = corte.lastIndexOf(" ");
  const recortado = ultimoEspacio > 0 ? corte.slice(0, ultimoEspacio) : corte;
  return `${recortado}…`;
}

/**
 * Los rótulos de los botones que se mandaron con un saliente, tal como los
 * dejó `guardarSaliente` en `payload.botones`. La bandeja solo guarda el texto
 * del mensaje, así que sin esto no había forma de ver qué opciones recibió el
 * lead. Cualquier otra forma —el mensaje crudo de Meta de un entrante, un
 * saliente anterior a este campo— da lista vacía.
 */
export function botonesDePayload(payload: unknown): string[] {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return [];
  const botones = (payload as { botones?: unknown }).botones;
  if (!Array.isArray(botones)) return [];
  return botones.filter((b): b is string => typeof b === "string");
}

/**
 * Etiqueta de la ventana de 24/72 h para la bandeja: cuánto queda si está
 * abierta (en horas, o en minutos si queda menos de una), o el aviso de que
 * hace falta una plantilla aprobada si está cerrada o no hay ventana.
 */
export function etiquetaVentana(ventanaHasta: string | null, ahora: Date): string {
  if (!ventanaAbierta(ventanaHasta, ahora)) return "Cerrada, hace falta plantilla";

  const restanteMs = new Date(ventanaHasta as string).getTime() - ahora.getTime();
  const minutos = Math.floor(restanteMs / 60000);
  if (minutos < 1) return "Abierta · menos de 1 min";
  if (minutos < 60) return `Abierta · quedan ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  return `Abierta · quedan ${horas} h`;
}

/** Rótulo del origen de un mensaje para la bandeja; los que salen o llegan por
 *  el camino normal (cliente, panel) no llevan etiqueta. */
export function etiquetaOrigen(origen: Mensaje["origen"] | undefined): string | null {
  if (origen === "movil") return "Desde el móvil";
  if (origen === "historial") return "Importado";
  if (origen === "bot") return "Bot";
  return null;
}

/** «Nombre» que se enseña de una conversación: el del lead vinculado o, si no,
 *  el nombre de contacto que dio WhatsApp —siempre con el teléfono al lado,
 *  porque ambos los puede controlar quien escribe (los leads nuevos se crean
 *  con su nombre de perfil) y el número no se puede falsear—; sin nombre, solo
 *  el teléfono. */
export function nombreConversacion(
  waId: string,
  leadId: string | null,
  nombres: Map<string, string>,
  nombreContacto?: string | null,
): string {
  const telefono = telefonoDeWaId(waId) ?? waId;
  const nombre = (leadId ? nombres.get(leadId)?.trim() : undefined) || nombreContacto?.trim();
  if (!nombre) return telefono;
  // Si el nombre ya lleva el teléfono (p. ej. «Lead de WhatsApp (447710173736)»), no se repite.
  const digitos = (t: string) => t.replace(/\D/g, "");
  const dn = digitos(nombre);
  const dt = digitos(telefono);
  if (dt && (dn.includes(dt) || dn.includes(digitos(waId)))) return nombre;
  return `${nombre} (${telefono})`;
}
