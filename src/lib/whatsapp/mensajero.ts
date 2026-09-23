import "server-only";

export const GRAPH_VERSION = "v21.0";

export type ResultadoEnvio = { ok: true; wamid: string | null } | { ok: false; error: string };

export interface MensajeroWhatsApp {
  enviarTexto(waId: string, texto: string): Promise<ResultadoEnvio>;
}

export interface ConfigMensajero {
  token?: string;
  phoneNumberId?: string;
  fetchImpl?: typeof fetch;
}

/** Guarda lo que se habría enviado. Para tests y para entornos sin credenciales. */
export function mensajeroSimulado(): MensajeroWhatsApp & {
  enviados: Array<{ waId: string; texto: string }>;
} {
  const enviados: Array<{ waId: string; texto: string }> = [];
  return {
    enviados,
    async enviarTexto(waId, texto) {
      enviados.push({ waId, texto });
      return { ok: true, wamid: null };
    },
  };
}

/**
 * Sin token o sin número configurado devuelve el simulado: preferimos no enviar
 * nada a reventar en producción o, peor, escribir a alguien desde una preview.
 *
 * Cuando las credenciales SÍ están pero llegan de `process.env` (no las pasó
 * quien invoca a propósito), exigimos además estar en producción. Esas
 * variables se heredan con facilidad en una preview de Vercel, un script
 * local o un entorno de staging sin que nadie lo decida explícitamente, y son
 * la única barrera que evita escribirle un mensaje real a un cliente real
 * desde donde no toca. Quien pasa `token`/`phoneNumberId` a mano en la
 * config sabe lo que hace (tests, envíos deliberados) y no pasa por esta
 * segunda barrera; para forzar un envío real de verdad sin estar en
 * producción existe la válvula explícita `WHATSAPP_ENVIO_REAL=1`.
 */
export function crearMensajero(config: ConfigMensajero = {}): MensajeroWhatsApp {
  const credencialesExplicitas = config.token !== undefined && config.phoneNumberId !== undefined;
  const token = config.token ?? process.env.WHATSAPP_TOKEN ?? "";
  const phoneNumberId = config.phoneNumberId ?? process.env.WHATSAPP_PHONE_NUMBER_ID ?? "";
  if (!token || !phoneNumberId) return mensajeroSimulado();

  if (!credencialesExplicitas) {
    const esProduccion = process.env.VERCEL_ENV === "production";
    const envioRealForzado = process.env.WHATSAPP_ENVIO_REAL === "1";
    if (!esProduccion && !envioRealForzado) return mensajeroSimulado();
  }

  const hacerFetch = config.fetchImpl ?? fetch;
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`;

  return {
    async enviarTexto(waId, texto) {
      try {
        const res = await hacerFetch(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: waId,
            type: "text",
            text: { body: texto },
          }),
        });
        const cuerpo = (await res.json()) as {
          messages?: Array<{ id?: string }>;
          error?: { message?: string };
        };
        if (!res.ok) return { ok: false, error: cuerpo.error?.message ?? "error desconocido" };
        return { ok: true, wamid: cuerpo.messages?.[0]?.id ?? null };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "error de red" };
      }
    },
  };
}
