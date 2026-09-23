import { ventanaAbierta } from "./ventana";

const LARGO_EXTRACTO = 80;

/**
 * Recorta un texto a 80 caracteres para la lista de conversaciones sin partir
 * palabras: busca el último espacio dentro del límite y corta ahí. Los
 * mensajes de imagen o audio no traen texto (`null`), así que se describen
 * en su lugar.
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
 * Etiqueta de la ventana de 24/72 h para la bandeja: cuánto queda si está
 * abierta (en horas, o en minutos si queda menos de una), o el aviso de que
 * hace falta una plantilla aprobada si está cerrada o no hay ventana.
 */
export function etiquetaVentana(ventanaHasta: string | null, ahora: Date): string {
  if (!ventanaAbierta(ventanaHasta, ahora)) return "Cerrada, hace falta plantilla";

  const restanteMs = new Date(ventanaHasta as string).getTime() - ahora.getTime();
  const minutos = Math.round(restanteMs / 60000);
  if (minutos < 60) return `Abierta · quedan ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  return `Abierta · quedan ${horas} h`;
}
