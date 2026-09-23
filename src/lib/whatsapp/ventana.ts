import { normalizarTelefono } from "../ventas/dominio";

const HORA = 60 * 60 * 1000;

/** Meta abre 24 h al responder, 72 h si el mensaje vino de un anuncio CTWA. */
export function calcularVentana(recibidoEn: Date, deAnuncio: boolean): Date {
  return new Date(recibidoEn.getTime() + (deAnuncio ? 72 : 24) * HORA);
}

export function ventanaAbierta(ventanaHasta: string | Date | null, ahora: Date): boolean {
  if (!ventanaHasta) return false;
  const hasta = ventanaHasta instanceof Date ? ventanaHasta : new Date(ventanaHasta);
  return Number.isFinite(hasta.getTime()) && hasta.getTime() > ahora.getTime();
}

/**
 * El `wa_id` de Meta viene con prefijo de país («34660415514») y el CRM guarda
 * los últimos 9 dígitos. Para números de fuera de España esa cola puede
 * coincidir entre personas distintas, así que se devuelve el número completo:
 * más vale no casar que casar mal.
 */
export function telefonoDeWaId(waId: string): string | null {
  const digitos = waId.replace(/\D/g, "");
  if (digitos.length < 6) return null;
  if (digitos.startsWith("34") && digitos.length === 11) return normalizarTelefono(digitos);
  return digitos;
}
