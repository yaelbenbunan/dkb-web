import "server-only";

export const GRAPH_VERSION = "v21.0";

export type ResultadoEnvio = { ok: true; wamid: string | null } | { ok: false; error: string };

export interface MensajeroWhatsApp {
  enviarTexto(waId: string, texto: string): Promise<ResultadoEnvio>;
  /** Texto con hasta 3 botones de respuesta rápida, de 20 caracteres cada uno. */
  enviarBotones(waId: string, texto: string, opciones: readonly string[]): Promise<ResultadoEnvio>;
}

/** Límites de los botones de respuesta rápida de WhatsApp. */
export const MAX_BOTONES = 3;
export const MAX_CARACTERES_BOTON = 20;

/**
 * Comprueba los límites ANTES de llamar a Graph. Meta rechaza estos casos con
 * un error genérico difícil de atribuir; fallar aquí, con el motivo delante,
 * convierte un misterio de producción en un test rojo.
 */
function comprobarBotones(opciones: readonly string[]): void {
  if (opciones.length === 0 || opciones.length > MAX_BOTONES) {
    throw new Error(`WhatsApp admite entre 1 y ${MAX_BOTONES} botones, y se han pasado ${opciones.length}.`);
  }
  const larga = opciones.find((o) => o.length > MAX_CARACTERES_BOTON);
  if (larga) {
    throw new Error(`Un botón no puede pasar de ${MAX_CARACTERES_BOTON} caracteres: «${larga}».`);
  }
}

export interface ConfigMensajero {
  token?: string;
  phoneNumberId?: string;
  fetchImpl?: typeof fetch;
}

/** Guarda lo que se habría enviado. Para tests y para entornos sin credenciales. */
export function mensajeroSimulado(): MensajeroWhatsApp & {
  enviados: Array<{ waId: string; texto: string; opciones?: readonly string[] }>;
} {
  const enviados: Array<{ waId: string; texto: string; opciones?: readonly string[] }> = [];
  return {
    enviados,
    async enviarTexto(waId, texto) {
      enviados.push({ waId, texto });
      return { ok: true, wamid: null };
    },
    async enviarBotones(waId, texto, opciones) {
      comprobarBotones(opciones);
      enviados.push({ waId, texto, opciones });
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

  /** Un único camino de salida a Graph: mismo timeout, mismo manejo de errores. */
  async function enviar(payload: Record<string, unknown>): Promise<ResultadoEnvio> {
      try {
        const res = await hacerFetch(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          // Sin esto, toda la política de fallos depende de que Graph
          // RESPONDA: si se cuelga, la función muere por timeout de
          // plataforma DESPUÉS de que el entrante ya se persistió, y
          // `guardarSaliente` no llega a ejecutarse — no queda ni una fila
          // `fallido` que explique el intento (Hallazgo I4, ronda de
          // arreglos 2). El `catch` de abajo convierte el abort en el mismo
          // error tipado que ya maneja cualquier fallo de red.
          signal: AbortSignal.timeout(8000),
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
  }

  return {
    enviarTexto(waId, texto) {
      return enviar({ messaging_product: "whatsapp", to: waId, type: "text", text: { body: texto } });
    },
    enviarBotones(waId, texto, opciones) {
      comprobarBotones(opciones);
      return enviar({
        messaging_product: "whatsapp",
        to: waId,
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: texto },
          action: {
            buttons: opciones.map((titulo, i) => ({
              type: "reply",
              // El id vuelve en el webhook junto al rótulo; se numera para que
              // cambiar el texto de un botón no rompa nada que dependa del id.
              reply: { id: `opcion_${i + 1}`, title: titulo },
            })),
          },
        },
      });
    },
  };
}
