/**
 * Módulo PURO de clasificación del webhook de WhatsApp Cloud API.
 *
 * Sin `server-only`, sin Supabase, sin red: solo lee el sobre que manda Meta
 * y decide qué hacer con cada mensaje. Esta pureza es deliberada: permite
 * testear toda la lógica de decisión sin depender de infraestructura, y la
 * reutilizan tanto la ruta del webhook como los tests.
 *
 * Meta reintenta el webhook y manda a la MISMA url eventos que no son
 * mensajes (calidad del número, plantillas). Por eso `extraerMensajes` y
 * `extraerEstados` nunca lanzan: ante cualquier forma inesperada devuelven
 * lista vacía. Una excepción aquí tumbaría el webhook entero.
 */

export interface MensajeEntrante {
  wamid: string;
  waId: string;
  texto: string | null;
  tipo: string;
  recibidoEn: Date;
  referral: { campana: string | null; anuncio: string | null; titular: string | null } | null;
}

export type Decision =
  | { accion: "crear_lead_y_responder" }
  | { accion: "responder" }
  | { accion: "guardar_respuesta" }
  | { accion: "solo_guardar" };

/** Guarda genérica de "objeto no nulo", para no repetir el chequeo en cada paso. */
function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null;
}

/**
 * Recorre `entry[].changes[].value` del sobre de Meta buscando el campo que
 * corresponda (`messages` o `statuses`). Cualquier forma que no encaje
 * (campo ausente, `entry` que no es array, `value` que no es objeto...) se
 * trata como "no hay nada que sacar de aquí", nunca como error.
 */
function valoresDeCambios(cuerpo: unknown): Record<string, unknown>[] {
  if (!esObjeto(cuerpo) || !Array.isArray(cuerpo.entry)) return [];
  const valores: Record<string, unknown>[] = [];
  for (const entrada of cuerpo.entry) {
    if (!esObjeto(entrada) || !Array.isArray(entrada.changes)) continue;
    for (const cambio of entrada.changes) {
      if (esObjeto(cambio) && esObjeto(cambio.value)) valores.push(cambio.value);
    }
  }
  return valores;
}

/**
 * El `referral` de Meta solo llega en mensajes que vienen de un anuncio
 * CTWA. `source_id` es el identificador del anuncio y `headline` su texto;
 * Meta no manda un nombre de campaña en este objeto, así que `campana`
 * queda a null hasta que haya un enriquecimiento posterior (p.ej. Ads API).
 */
function referralDeMensaje(valor: unknown): MensajeEntrante["referral"] {
  if (!esObjeto(valor)) return null;
  return {
    campana: null,
    anuncio: typeof valor.source_id === "string" ? valor.source_id : null,
    titular: typeof valor.headline === "string" ? valor.headline : null,
  };
}

export function extraerMensajes(cuerpo: unknown): MensajeEntrante[] {
  const mensajes: MensajeEntrante[] = [];
  for (const valor of valoresDeCambios(cuerpo)) {
    if (!Array.isArray(valor.messages)) continue;
    for (const m of valor.messages) {
      if (!esObjeto(m)) continue;
      if (typeof m.id !== "string" || typeof m.from !== "string" || typeof m.timestamp !== "string") continue;
      const tipo = typeof m.type === "string" ? m.type : "desconocido";
      // El timestamp de Meta viene en SEGUNDOS desde epoch, como cadena.
      const segundos = Number(m.timestamp);
      const recibidoEn = new Date(Number.isFinite(segundos) ? segundos * 1000 : NaN);
      mensajes.push({
        wamid: m.id,
        waId: m.from,
        // Solo los mensajes de texto tienen texto: uno con imagen, audio,
        // ubicación o pulsación de botón no se puede guardar como respuesta.
        texto: tipo === "text" && esObjeto(m.text) && typeof m.text.body === "string" ? m.text.body : null,
        tipo,
        recibidoEn,
        referral: referralDeMensaje(m.referral),
      });
    }
  }
  return mensajes;
}

const ESTADOS_META: Record<string, "entregado" | "leido" | "fallido"> = {
  delivered: "entregado",
  read: "leido",
  failed: "fallido",
};

export function extraerEstados(cuerpo: unknown): Array<{ wamid: string; estado: "entregado" | "leido" | "fallido" }> {
  const estados: Array<{ wamid: string; estado: "entregado" | "leido" | "fallido" }> = [];
  for (const valor of valoresDeCambios(cuerpo)) {
    if (!Array.isArray(valor.statuses)) continue;
    for (const s of valor.statuses) {
      if (!esObjeto(s) || typeof s.id !== "string" || typeof s.status !== "string") continue;
      const estado = ESTADOS_META[s.status];
      // "sent" y otros estados que no nos interesan se ignoran sin más.
      if (estado) estados.push({ wamid: s.id, estado });
    }
  }
  return estados;
}

/**
 * Tabla de decisión (spec `2026-09-23-whatsapp-canal-design.md`):
 * - Con `referral` (viene de un anuncio): crea lead si no existe, si no solo
 *   responde. El bot solo se dispara desde un anuncio, nunca a quien ya
 *   estaba conversando.
 * - Sin `referral`: si la conversación estaba en `bot` y el mensaje trae
 *   texto, cuenta como la respuesta a la pregunta de cualificación. Un
 *   mensaje sin texto (imagen, audio...) no se puede guardar como respuesta,
 *   así que no cuenta aunque la conversación esté en `bot`.
 */
export function decidir(input: {
  mensaje: MensajeEntrante;
  conversacion: { estado: "bot" | "humana" | "cerrada" } | null;
  leadExiste: boolean;
}): Decision {
  const { mensaje, conversacion, leadExiste } = input;

  if (mensaje.referral) {
    return leadExiste ? { accion: "responder" } : { accion: "crear_lead_y_responder" };
  }

  if (conversacion?.estado === "bot" && mensaje.texto !== null) {
    return { accion: "guardar_respuesta" };
  }

  return { accion: "solo_guardar" };
}
