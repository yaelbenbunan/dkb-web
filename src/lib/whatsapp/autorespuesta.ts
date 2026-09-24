/**
 * Texto de la autorespuesta del canal de WhatsApp: vive en un único sitio
 * para poder cambiar la redacción sin tocar la lógica de `procesar.ts`.
 *
 * Saluda, dice a qué viene en una frase y pregunta el problema con botones.
 * Deliberadamente corto: cada línea de más antes de la pregunta es una línea
 * en la que el lead puede abandonar. Tampoco repite el titular del anuncio
 * —se probó y quedaba pesado—, así que el titular puede escribirse libre en
 * Meta sin pensar en cómo suena dentro de una frase.
 *
 * El argumento cambia según el anuncio del que venga: a una clínica dental se
 * le habla de ganar más con cada paciente, y a una consulta de psicología de
 * llenar la agenda, porque su sesión tiene un precio que no se estira. Esa
 * distinción ya está decidida en `escala-sectores.ts` y no es un matiz de
 * estilo: es lo que hace que el mensaje aterrice o no.
 *
 * Un anuncio sin mapear cae en el texto común, que sirve para cualquier
 * clínica. Es deliberado: al estrenar una campaña el anuncio existe antes de
 * que nadie lo añada aquí, y ese primer impacto ya está pagado. Nótese además
 * que esta respuesta SOLO se dispara con clics de anuncio —quien escribe
 * orgánicamente no recibe bot—, así que dar por hecho que el interlocutor es
 * una clínica es seguro.
 */

// Límite duro de WhatsApp Cloud API para un mensaje de texto.
const LIMITE_WHATSAPP = 1024;

/** Quien firma. Aquí arriba para cambiarlo en un solo sitio. */
const REMITENTE = "Paula";

export type Vertical = "dental" | "psicologia" | "generico";

/**
 * Identificador de anuncio de Meta (`referral.source_id`) → vertical.
 *
 * Se rellena a mano al lanzar una campaña. Vive en código, y no en la base,
 * porque cambia al ritmo de las campañas y conviene que quede en el historial:
 * dentro de seis meses, saber qué anuncio decía qué explica las métricas de
 * ese mes.
 */
export const VERTICAL_POR_ANUNCIO: Record<string, Vertical> = {
  // Campaña de captación de consultas de psicología (24-09-2026).
  "120252112386740343": "psicologia",
};

export function verticalDeAnuncio(anuncio: string | null): Vertical {
  return (anuncio && VERTICAL_POR_ANUNCIO[anuncio]) || "generico";
}

const PREGUNTA = "Para poder ofrecerte la mejor solución, cuéntanos: ¿cuál es el principal problema que estás teniendo?";

/** Cuerpo del mensaje, por sector. Las opciones van aparte, como botones. */
const CUERPO: Record<Vertical, string> = {
  dental:
    `¡Hola! Soy ${REMITENTE}, de Escala. Gracias por interesarte en nuestro proceso para que ganes más con cada paciente.\n\n` +
    PREGUNTA,
  psicologia:
    `¡Hola! Soy ${REMITENTE}, de Escala. Gracias por interesarte en nuestro proceso para llenar la agenda de tu consulta.\n\n` +
    PREGUNTA,
  generico:
    `¡Hola! Soy ${REMITENTE}, de Escala. Gracias por interesarte en nuestro proceso para conseguir que ganes más pacientes.\n\n` +
    PREGUNTA,
};

/**
 * Las tres opciones que se mandan como botones de respuesta rápida.
 *
 * Son las mismas que las de la secuencia del sector en
 * `ventas/secuencias-plantilla.ts`, para que el vocabulario no se bifurque
 * entre el primer mensaje y el resto de la conversación. Y caben en los 20
 * caracteres que admite un botón de WhatsApp, que es lo que obliga a decir
 * «Vienen 1 vez y ya» en vez de «Vienen una vez y no vuelven».
 */
const OPCIONES: Record<Vertical, readonly string[]> = {
  dental: ["Faltan pacientes", "Primera visita y ya", "Vienen y no vuelven"],
  psicologia: ["Huecos en la agenda", "Vienen 1 vez y ya", "Solo boca a boca"],
  generico: ["Faltan pacientes", "No se quedan", "Solo boca a boca"],
};

export function textoAutorespuesta({ anuncio }: { anuncio: string | null }): string {
  return CUERPO[verticalDeAnuncio(anuncio)].slice(0, LIMITE_WHATSAPP);
}

export function opcionesAutorespuesta(anuncio: string | null): readonly string[] {
  return OPCIONES[verticalDeAnuncio(anuncio)];
}
