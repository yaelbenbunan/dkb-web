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
 * El argumento es el mismo para todos —llenar la agenda— desde el 25 de
 * septiembre de 2026, cuando Growth dejó de vender «ganar más» y se quedó en
 * la captación (`growth-sectores.ts`). Lo que cambia según el anuncio del que
 * venga es cómo se nombra el sitio —clínica, consulta— y las opciones de
 * respuesta.
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

/** Quien firma. Aquí arriba para cambiarlo en un solo sitio: exportado
 *  porque `procesar.ts` reutiliza el mismo nombre como remitente del primer
 *  paso de una secuencia (ronda de arreglos 1, tarea 7) — duplicar el
 *  literal en los dos sitios lo habría dejado desincronizable. */
export const REMITENTE = "Paula";

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

/**
 * Cuerpo del mensaje, por sector. Las opciones van aparte, como botones.
 *
 * Exportado (además de usarse aquí dentro) para que
 * `ventas/secuencias-plantilla.ts` pueda comparar contra él en un test: el
 * paso de inicio de cada secuencia es, palabra por palabra, este texto, y sin
 * ese test los dos podrían divergir en silencio si alguien retoca uno sin el
 * otro.
 */
export const CUERPO: Record<Vertical, string> = {
  dental:
    `¡Hola! Soy ${REMITENTE}, de Growth. Gracias por interesarte en nuestro proceso para llenar la agenda de tu clínica.\n\n` +
    PREGUNTA,
  psicologia:
    `¡Hola! Soy ${REMITENTE}, de Growth. Gracias por interesarte en nuestro proceso para llenar la agenda de tu consulta.\n\n` +
    PREGUNTA,
  generico:
    `¡Hola! Soy ${REMITENTE}, de Growth. Gracias por interesarte en nuestro proceso para llenar tu agenda de pacientes nuevos.\n\n` +
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
 *
 * Exportada por el mismo motivo que `CUERPO`: para que un test en
 * `ventas/secuencias-plantilla.ts` compruebe que los rótulos no se
 * bifurcaron.
 */
export const OPCIONES: Record<Vertical, readonly string[]> = {
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
