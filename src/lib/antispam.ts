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

/** Mensaje para quien BotID toma por bot. Si es una persona, recargar suele bastar. */
export const MENSAJE_BOT = "No hemos podido verificar el envío. Recarga la página e inténtalo de nuevo.";

/**
 * BotID de Vercel (invisible, sin captcha). La página tiene que estar cubierta
 * por `initBotId` en `src/instrumentation-client.ts`, o toda petición se verá
 * como bot. En desarrollo y en tests siempre responde «humano».
 *
 * Si BotID falla, deja pasar: perder un lead real es peor que colar un bot.
 */
export async function esEnvioDeBot(): Promise<boolean> {
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
