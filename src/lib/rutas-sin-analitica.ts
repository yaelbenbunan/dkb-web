/**
 * Rutas donde NO se carga nada de analítica ni publicidad (GTM, Vercel
 * Analytics, píxeles, captura de UTM) ni, por tanto, el banner de cookies.
 *
 * /alta/<token>: el token del formulario de alta de un cliente va en la URL y
 * es su única credencial; si se cargara GTM acabaría en Google Analytics.
 * Puro: lo usan el layout raíz (vía SoloConAnalitica) y los tests.
 */
const PREFIJOS = ["/alta"];

export function esRutaSinAnalitica(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return PREFIJOS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
