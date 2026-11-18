/**
 * «¿Has olvidado tu contraseña?» del panel. Puro: lo usan las acciones y los tests.
 *
 * El flujo: la usuaria pide el enlace → Supabase manda el correo de
 * recuperación → el enlace vuelve a `/panel/ventas/login/recuperar/vuelta` con
 * un `code` → se canjea por una sesión → pone la contraseña nueva en
 * `/panel/ventas/login/nueva`.
 *
 * Supabase solo vuelve a direcciones de su lista «Redirect URLs»
 * (Authentication → URL Configuration). Si la dirección no está, el enlace
 * acaba en la «Site URL» y no se puede poner la contraseña.
 */

export const RUTA_VUELTA = "/panel/ventas/login/recuperar/vuelta";
export const RUTA_NUEVA = "/panel/ventas/login/nueva";
const PRODUCCION = "https://www.dinkbit.es";

/**
 * A qué web vuelve el enlace del correo: la misma desde la que se pidió si es
 * una nuestra (producción, una versión de prueba de Vercel o el ordenador);
 * cualquier otra cabecera `Host` acaba en producción.
 */
export function origenDeVuelta(host: string | null, proto: string | null): string {
  if (!host) return PRODUCCION;
  const h = host.toLowerCase();
  if (h === "www.dinkbit.es" || h === "dinkbit.es") return PRODUCCION;
  if (/^dkb-[a-z0-9-]+\.vercel\.app$/.test(h)) return `https://${h}`;
  if (/^localhost(:\d+)?$/.test(h)) return `${proto === "https" ? "https" : "http"}://${h}`;
  return PRODUCCION;
}

/** El email del formulario, limpio, o null si no lo parece. */
export function emailDeRecuperacion(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}
