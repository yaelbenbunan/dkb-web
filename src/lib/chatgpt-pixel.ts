/**
 * Píxel de medición de OpenAI (anuncios en ChatGPT).
 *
 * El SDK se carga desde `ChatGPTPixel`, y solo si la persona ha aceptado las
 * cookies de marketing: aquí únicamente se llama a `window.oaiq` cuando ya
 * existe. Si no está, cada función se queda en nada — igual que `trackMetaLead`.
 *
 * La firma del SDK es `oaiq("measure", evento, datos, opciones)` y los nombres
 * de evento son los suyos, no los de Meta: un lead es `lead_created`.
 * https://developers.openai.com/ads/conversion-tracking
 *
 * El `event_id` es el mismo identificador que se manda a Meta desde el
 * formulario. Sirve para que, el día que se conecte la Conversions API de
 * OpenAI, el evento del servidor y el del navegador cuenten como uno solo.
 */

declare global {
  interface Window {
    oaiq?: (...args: unknown[]) => void;
  }
}

/** Id del píxel en OpenAI Ads Manager. Viaja en el JS del navegador, así que
 *  no es un secreto; la variable de entorno está para poder cambiarlo sin
 *  tocar el código. */
export const CHATGPT_PIXEL_ID =
  process.env.NEXT_PUBLIC_CHATGPT_PIXEL_ID || "YVpNtzVZ1Yb5erxgjao65F";

function measure(
  event: string,
  data: Record<string, unknown>,
  options: Record<string, unknown> = {},
): void {
  if (typeof window === "undefined" || typeof window.oaiq !== "function") return;
  window.oaiq("measure", event, data, options);
}

/** Conversión: alguien ha enviado un formulario de contacto o presupuesto. */
export function trackChatGptLead(eventId: string, formLocation: string): void {
  measure(
    "lead_created",
    {
      type: "contents",
      contents: [{ id: formLocation, name: formLocation, content_type: "form" }],
    },
    eventId ? { event_id: eventId } : {},
  );
}

/** Vista de página en navegación interna. La primera carga ya la cuenta el
 *  `init` del SDK, así que esto solo se llama al cambiar de ruta. */
export function trackChatGptPageView(path: string): void {
  measure("page_viewed", {
    type: "contents",
    contents: [{ id: path, name: path, content_type: "page" }],
  });
}
