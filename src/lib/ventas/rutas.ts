/** Reglas de acceso de /panel/ventas. Puro: lo usan el proxy, el login y los tests. */

export type RutaPanel = "ventas-login" | "ventas" | "panel-login" | "panel";

function bajo(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function clasificarRutaPanel(pathname: string): RutaPanel {
  if (bajo(pathname, "/panel/ventas/login")) return "ventas-login";
  if (bajo(pathname, "/panel/ventas")) return "ventas";
  if (pathname.startsWith("/panel/login")) return "panel-login";
  return "panel";
}

/** A dónde volver tras iniciar sesión. Solo rutas internas de ventas: nunca
 *  otra web (open redirect) ni el propio login. */
export function destinoTrasLogin(raw: unknown): string {
  const porDefecto = "/panel/ventas";
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return porDefecto;
  const ruta = raw.split(/[?#]/)[0];
  return clasificarRutaPanel(ruta) === "ventas" ? raw : porDefecto;
}

export type Acceso = "ok" | "login" | "permiso";

export function evaluarAcceso(usuaria: { rol: string; activa: boolean } | null, rol?: "admin"): Acceso {
  if (!usuaria || !usuaria.activa) return "login";
  if (rol === "admin" && usuaria.rol !== "admin") return "permiso";
  return "ok";
}
