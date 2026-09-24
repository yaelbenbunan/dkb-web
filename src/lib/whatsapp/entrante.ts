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
  // Id del botón o de la opción de lista que pulsó el lead (`opcion_1`,
  // `opcion_2`...), o `null` si escribió a mano. Ver `botonDelMensaje`.
  botonId: string | null;
  tipo: string;
  recibidoEn: Date;
  referral: { campana: string | null; anuncio: string | null; titular: string | null } | null;
  // El objeto tal cual lo mandó Meta para ESTE mensaje, sin normalizar. La
  // columna `payload` (jsonb) se creó para poder recuperar más adelante lo
  // que hoy no se extrae (adjuntos, ids de imagen/audio/ubicación...), así
  // que hay que guardar esto, no el `MensajeEntrante` ya procesado.
  crudo: unknown;
}

export type Decision =
  | { accion: "crear_lead_y_responder" }
  | { accion: "responder" }
  | { accion: "guardar_respuesta" }
  | { accion: "solo_guardar" };

/**
 * Guarda genérica de "objeto no nulo", para no repetir el chequeo en cada
 * paso. Excluye arrays a propósito (ronda de arreglos 1, minor): `typeof []`
 * también da `"object"`, así que sin este descarte un `interactive: []` o un
 * `button_reply: []` colaría como objeto válido y el `.id`/`.title` leído
 * encima sería `undefined` en vez de descartarse limpiamente por forma.
 */
function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
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

// Suelo de cordura para el timestamp de Meta: 1 de enero de 2000 en
// segundos desde epoch. Cualquier valor anterior (incluido 0) es basura, no
// un mensaje real de WhatsApp.
//
// OJO con la trampa: `Number("")` y `Number("   ")` devuelven 0, NO NaN.
// Un `timestamp: ""` pasaría `Number.isFinite` sin problema y produciría
// `new Date(0)` (1970), desplazando la ventana de conversación cinco
// décadas en silencio. Por eso el chequeo de abajo exige ADEMÁS que el
// valor sea posterior a este suelo, no solo que sea finito.
const TIMESTAMP_MINIMO_SEGUNDOS = 946684800;

// Techo de cordura (Minor 1, ronda de arreglos 2): el suelo de arriba no
// tenía tope superior. Meta manda el timestamp en SEGUNDOS, pero un
// timestamp mandado en MILISEGUNDOS por error (13 dígitos) pasa el suelo sin
// problema y produce una fecha del año ~58700 — válida para JS y para
// Postgres, así que se guarda sin más, y `ventanaAbierta` da `true` para
// siempre: la bandeja anunciaría "Abierta · quedan 490.000.000 h", la
// comercial escribiría, y Meta lo rechazaría. Diez años en el futuro desde
// ahora es un margen de sobra para cualquier reloj real, y descarta de
// sobra cualquier timestamp en milisegundos.
const DIEZ_ANIOS_EN_SEGUNDOS = 10 * 365 * 24 * 60 * 60;

/**
 * Texto e id de botón del mensaje entrante, extraídos JUNTOS en una sola
 * pasada sobre el mismo objeto de respuesta. Cubre el texto normal y las dos
 * formas en que WhatsApp devuelve una opción pulsada (botón y lista); lo demás
 * —imagen, audio, ubicación, o cualquier `interactive` que Meta añada en el
 * futuro— deja ambos en `null`, que es lo que hace que no cuente como
 * respuesta.
 *
 * Ronda de arreglos 1 (tarea 2): antes `texto` y su `botonId` se sacaban con
 * dos funciones que recorrían por separado el mismo `button_reply` /
 * `list_reply`, cada una mirando un campo distinto (`title` una, `id` la
 * otra). Si el payload traía uno sin el otro —p. ej. un `id` numérico junto
 * a un `title` válido—, el mensaje se guardaba CON rótulo pero SIN id. El
 * motor de secuencias avanza por ÍNDICE traducido a través del id: sin él,
 * el lead pulsa un botón y la conversación se va por el camino de "texto
 * libre", que la para — un fallo silencioso, porque `texto` sigue viéndose
 * bien en la bandeja. Por eso ahora los dos salen de la MISMA comprobación:
 * o `id` y `title` son ambos string y se devuelven los dos, o no se cuenta
 * ninguno.
 */
function respuestaDelMensaje(tipo: string, m: Record<string, unknown>): { texto: string | null; botonId: string | null } {
  if (tipo === "text") {
    const texto = esObjeto(m.text) && typeof m.text.body === "string" ? m.text.body : null;
    return { texto, botonId: null };
  }
  if (tipo === "interactive" && esObjeto(m.interactive)) {
    for (const clave of ["button_reply", "list_reply"] as const) {
      const respuesta = m.interactive[clave];
      if (esObjeto(respuesta) && typeof respuesta.id === "string" && typeof respuesta.title === "string") {
        return { texto: respuesta.title, botonId: respuesta.id };
      }
    }
  }
  return { texto: null, botonId: null };
}

export function extraerMensajes(cuerpo: unknown): MensajeEntrante[] {
  const mensajes: MensajeEntrante[] = [];
  // Techo calculado una vez por llamada, no como constante de módulo: así no
  // queda congelado al momento en que arrancó el proceso.
  const techoSegundos = Math.floor(Date.now() / 1000) + DIEZ_ANIOS_EN_SEGUNDOS;
  for (const valor of valoresDeCambios(cuerpo)) {
    if (!Array.isArray(valor.messages)) continue;
    for (const m of valor.messages) {
      if (!esObjeto(m)) {
        // Sin id ni nada que loguear: no hay más rastro posible que dejar.
        console.warn("[whatsapp] mensaje descartado: no es un objeto");
        continue;
      }
      if (typeof m.id !== "string" || typeof m.from !== "string" || typeof m.timestamp !== "string") {
        // Minor 4 (ronda de arreglos 2): antes esto descartaba con `continue`
        // mudo — cero traza, lead perdido en silencio. Se avisa con lo que
        // haya disponible para que sea diagnosticable.
        console.warn("[whatsapp] mensaje descartado: falta id/from/timestamp", m.id ?? "(sin id)");
        continue;
      }
      // El timestamp de Meta viene en SEGUNDOS desde epoch, como cadena.
      // Un timestamp inválido o imposible descarta el mensaje entero (no se
      // guarda ningún `MensajeEntrante` con un `Date` inválido ni con una
      // fecha imposible): un `Invalid Date` viajaría hasta el guardado y un
      // `.toISOString()` posterior lanzaría, devolviendo 500 y metiendo a
      // Meta en un bucle de reintentos — justo lo que este módulo existe
      // para evitar. El techo (Minor 1) descarta además un timestamp en
      // milisegundos por error.
      const segundos = Number(m.timestamp);
      if (!Number.isFinite(segundos) || segundos <= TIMESTAMP_MINIMO_SEGUNDOS || segundos > techoSegundos) {
        console.warn("[whatsapp] mensaje descartado: timestamp fuera de rango", m.id, m.timestamp);
        continue;
      }
      const tipo = typeof m.type === "string" ? m.type : "desconocido";
      const recibidoEn = new Date(segundos * 1000);
      // Texto del mensaje y, si aplica, el id del botón pulsado: el cuerpo
      // si es de texto, o el rótulo + id del botón/opción de lista si el
      // lead respondió pulsando. Salen juntos de `respuestaDelMensaje` para
      // que no pueda haber uno sin el otro (ver su comentario). El resto
      // (imagen, audio, ubicación) no se puede guardar como respuesta.
      const { texto, botonId } = respuestaDelMensaje(tipo, m);
      mensajes.push({
        wamid: m.id,
        waId: m.from,
        texto,
        botonId,
        tipo,
        recibidoEn,
        referral: referralDeMensaje(m.referral),
        crudo: m,
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
