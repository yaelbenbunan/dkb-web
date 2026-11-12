import "server-only";
import { checkBotId } from "botid/server";

/**
 * Defensas de los formularios públicos contra bots.
 *
 * En nov. 2026 entraron decenas de leads falsos por el formulario del Home:
 * nombres inventados, teléfonos de EE. UU. y emails robados de terceros. El
 * campo trampa y el tiempo mínimo no los paraban (el tiempo lo manda el propio
 * navegador). Probablemente usaban el acuse de recibo para llenar de correo el
 * buzón de otra persona, lo que acaba quemando el dominio de envío.
 */

/** Mensaje para quien se toma por bot. Si es una persona, recargar suele bastar. */
export const MENSAJE_BOT = "No hemos podido verificar el envío. Recarga la página e inténtalo de nuevo.";

/**
 * ¿Hay que rechazar este envío? Dos comprobaciones:
 *
 * 1. El teléfono con el patrón de los bots (ver `telefonoConPatronSpam`).
 *    Barata, sin falsos positivos en los leads reales que tenemos.
 * 2. Vercel BotID, SOLO si `ANTISPAM_BOTID=1`. Está apagado porque dinkbit.es
 *    va detrás de Cloudflare y, así, BotID tomaba por bot a todo el mundo en
 *    producción (12/11/2026; en la preview, sin Cloudflare, funcionaba). Para
 *    encenderlo, el dominio tiene que apuntar a Vercel sin el proxy de
 *    Cloudflare (nube gris), y probarlo en www.dinkbit.es antes de dejarlo.
 *    Si BotID falla, deja pasar: perder un lead real es peor que colar un bot.
 */
export async function esEnvioDeBot(formData: FormData): Promise<boolean> {
  const telefono = formData.get("phone") ?? formData.get("telefono");
  if (typeof telefono === "string" && telefonoConPatronSpam(telefono)) {
    console.warn("[antispam] envío bloqueado: teléfono con patrón de bot");
    return true;
  }

  if (process.env.ANTISPAM_BOTID !== "1") return false;
  try {
    const verificacion = await checkBotId();
    // Las métricas de BotID del Firewall piden Observability Plus (de pago); este
    // aviso en los logs de Vercel es la forma gratuita de ver cuántos se paran.
    if (verificacion.isBot) console.warn("[antispam] envío bloqueado por BotID");
    return verificacion.isBot;
  } catch (err) {
    console.error("[antispam] checkBotId falló, se deja pasar:", err);
    return false;
  }
}

/**
 * El patrón de teléfono de los bots de nov. 2026: «1» + diez cifras, sin «+»
 * (19428314176). Ningún lead real del CRM tenía ese formato: los españoles
 * escriben 9 cifras o +34, y quien es de EE. UU. de verdad pone el «+1».
 */
export function telefonoConPatronSpam(telefono: string | null | undefined): boolean {
  const t = (telefono ?? "").trim();
  if (!t || t.startsWith("+") || t.startsWith("00")) return false;
  const cifras = t.replace(/[\s.\-()]/g, "");
  return /^1\d{10}$/.test(cifras);
}
