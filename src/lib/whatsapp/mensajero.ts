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
 */
export function crearMensajero(config: ConfigMensajero = {}): MensajeroWhatsApp {
  const token = config.token ?? process.env.WHATSAPP_TOKEN ?? "";
  const phoneNumberId = config.phoneNumberId ?? process.env.WHATSAPP_PHONE_NUMBER_ID ?? "";
  if (!token || !phoneNumberId) return mensajeroSimulado();

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
