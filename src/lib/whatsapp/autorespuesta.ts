/**
 * Texto de la autorespuesta del canal de WhatsApp: vive en un único sitio
 * para poder cambiar la redacción sin tocar la lógica de `procesar.ts`.
 *
 * Hace dos cosas a la vez (no es un acuse de recibo a secas): confirma que
 * el mensaje ha llegado y lanza la primera pregunta de cualificación. Cuando
 * Meta manda el titular del anuncio (`referral.titular`) lo menciona, porque
 * reconocer de dónde viene la persona sube mucho la tasa de respuesta.
 *
 * La pregunta cambia según el anuncio del que venga: no es lo mismo lo que le
 * duele a una clínica dental —pacientes que entran y no arrancan tratamiento—
 * que a una consulta de psicología —huecos en la agenda—. Ese argumento por
 * sector ya está decidido en `escala-sectores.ts`.
 *
 * Un anuncio sin mapear cae en la pregunta común, que habla de pacientes y
 * sirve para cualquier clínica. Eso es deliberado: al estrenar una campaña el
 * anuncio existe antes de que nadie lo haya añadido aquí, y ese primer
 * impacto ya está pagado. Nótese además que esta respuesta SOLO se dispara con
 * clics de anuncio —quien escribe orgánicamente no recibe bot—, así que dar
 * por hecho que el interlocutor es una clínica es seguro.
 */

// Límite duro de WhatsApp Cloud API para un mensaje de texto.
const LIMITE_WHATSAPP = 1024;

// Recorte defensivo del titular: Meta no garantiza una longitud razonable y
// un titular desbocado no debe poder tirar el mensaje por encima del límite
// de WhatsApp.
const LIMITE_TITULAR = 120;

export type Vertical = "dental" | "psicologia" | "generico";

/**
 * Identificador de anuncio de Meta (`referral.source_id`) → vertical.
 *
 * Se rellena a mano cuando se lanza una campaña. Vive en código, y no en la
 * base, porque cambia al ritmo de las campañas y conviene que quede en el
 * historial: dentro de seis meses, saber qué anuncio decía qué explica las
 * métricas de ese mes.
 */
export const VERTICAL_POR_ANUNCIO: Record<string, Vertical> = {
  // Pendiente: añadir aquí los identificadores en cuanto existan los anuncios.
};

export function verticalDeAnuncio(anuncio: string | null): Vertical {
  return (anuncio && VERTICAL_POR_ANUNCIO[anuncio]) || "generico";
}

/**
 * Quien firma el mensaje. Aquí arriba para cambiarlo en un sitio si algún día
 * atiende otra persona.
 */
const REMITENTE = "Paula";

/**
 * Presentación y opciones, por sector.
 *
 * Las opciones van NUMERADAS y no como botones de WhatsApp a propósito:
 * todavía no sabemos procesar una pulsación —llega como mensaje interactivo y
 * `entrante.ts` la guardaría sin texto, perdiendo la respuesta—, mientras que
 * un número llega como texto normal y queda en la ficha del lead. Los botones
 * llegan con la entrega 2.
 *
 * Las tres opciones de cada sector son las mismas que las de su secuencia en
 * `ventas/secuencias-plantilla.ts`, para que el vocabulario no se bifurque.
 */
const CUERPO: Record<Vertical, string> = {
  dental:
    `Soy ${REMITENTE}, de Escala. Nos ocupamos de todo el camino: desde que alguien busca dentista en Google o Instagram hasta que se sienta en tu sillón.\n\n` +
    "Para contarte lo que encaja contigo, ¿qué es lo que más te pasa ahora?\n" +
    "1. Faltan pacientes nuevos\n" +
    "2. Vienen a la primera visita y no siguen\n" +
    "3. No vuelven después del tratamiento\n\n" +
    "Responde con el número y seguimos.",
  psicologia:
    `Soy ${REMITENTE}, de Escala. Nos ocupamos de todo el camino: desde que alguien busca psicólogo en Google o Instagram hasta que se sienta en tu consulta.\n\n` +
    "Para contarte lo que encaja contigo, ¿qué es lo que más te pasa ahora?\n" +
    "1. Huecos en la agenda\n" +
    "2. Vienen una vez y no vuelven\n" +
    "3. Dependo del boca a boca\n\n" +
    "Responde con el número y seguimos.",
  generico:
    `Soy ${REMITENTE}, de Escala. Nos ocupamos de todo el camino: desde que alguien os busca en Google o Instagram hasta que ese paciente llega a tu consulta.\n\n` +
    "Para contarte lo que encaja contigo, ¿qué es lo que más te pasa ahora?\n" +
    "1. Faltan pacientes nuevos\n" +
    "2. Llegan pero no se quedan\n" +
    "3. Dependo del boca a boca\n\n" +
    "Responde con el número y seguimos.",
};

export function textoAutorespuesta({
  titularAnuncio,
  anuncio,
}: {
  titularAnuncio: string | null;
  anuncio: string | null;
}): string {
  const titular = titularAnuncio ? titularAnuncio.slice(0, LIMITE_TITULAR) : null;
  const entrada = titular
    ? `¡Hola! Gracias por escribirnos desde el anuncio «${titular}».`
    : "¡Hola! Gracias por escribirnos.";
  const texto = `${entrada}\n\n${CUERPO[verticalDeAnuncio(anuncio)]}`;
  return texto.slice(0, LIMITE_WHATSAPP);
}
