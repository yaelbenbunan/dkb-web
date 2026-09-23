/**
 * Texto de la autorespuesta del canal de WhatsApp: vive en un único sitio
 * para poder cambiar la redacción sin tocar la lógica de `procesar.ts`.
 *
 * Hace dos cosas a la vez (no es un acuse de recibo a secas): confirma que
 * el mensaje ha llegado y lanza la primera pregunta de cualificación. Cuando
 * Meta manda el titular del anuncio (`referral.titular`) lo menciona, porque
 * reconocer de dónde viene la persona sube mucho la tasa de respuesta.
 */

// Límite duro de WhatsApp Cloud API para un mensaje de texto.
const LIMITE_WHATSAPP = 1024;

// Recorte defensivo del titular: Meta no garantiza una longitud razonable y
// un titular desbocado no debe poder tirar el mensaje por encima del límite
// de WhatsApp.
const LIMITE_TITULAR = 120;

export function textoAutorespuesta({ titularAnuncio }: { titularAnuncio: string | null }): string {
  const titular = titularAnuncio ? titularAnuncio.slice(0, LIMITE_TITULAR) : null;
  const entrada = titular
    ? `¡Hola! Gracias por escribirnos desde el anuncio «${titular}».`
    : "¡Hola! Gracias por escribirnos.";
  const texto = `${entrada} Soy del equipo de Dinkbit y te leo enseguida.\n\nPara ir adelantando: ¿qué necesitas exactamente, una web nueva o mejorar la que ya tienes?`;
  return texto.slice(0, LIMITE_WHATSAPP);
}
