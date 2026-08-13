/**
 * Evento de conversión en el navegador.
 *
 * El píxel lo carga Google Tag Manager, así que aquí solo se llama a `fbq` si
 * ya está disponible. Se hace desde el código y no como etiqueta de GTM a
 * propósito: así el seguimiento no depende de que una configuración externa
 * siga en pie, y quien lea el formulario ve que ahí se mide una conversión.
 *
 * El `eventId` viaja también al servidor, que manda el mismo evento por la API
 * de Conversiones. Meta los une por ese identificador y cuenta uno solo.
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/** Identificador compartido entre el navegador y el servidor. */
export function newEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function trackMetaLead(eventId: string): void {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  window.fbq("track", "Lead", {}, { eventID: eventId });
}
