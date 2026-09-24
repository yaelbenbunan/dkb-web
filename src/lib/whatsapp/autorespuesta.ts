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

/** La pregunta que abre la cualificación, por sector. */
const PREGUNTA: Record<Vertical, string> = {
  dental:
    "Para ir adelantando: ¿qué te pasa más, que faltan pacientes nuevos o que entran y se quedan en la primera visita sin empezar el tratamiento?",
  psicologia:
    "Para ir adelantando: ¿cómo tienes la agenda ahora mismo, con huecos que te gustaría llenar o llena pero a base de boca a boca?",
  generico:
    "Para ir adelantando: ¿qué te urge más ahora mismo, que entren más pacientes nuevos o que los que entran se queden?",
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
  const texto = `${entrada} Soy del equipo de Dinkbit y te leo enseguida.\n\n${PREGUNTA[verticalDeAnuncio(anuncio)]}`;
  return texto.slice(0, LIMITE_WHATSAPP);
}
