import { ventanaAbierta } from "./ventana";

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
