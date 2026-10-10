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

/** «equipo» = admin o comercial: lo que la clienta nunca debe tocar. */
export function evaluarAcceso(usuaria: { rol: string; activa: boolean } | null, rol?: "admin" | "equipo"): Acceso {
  if (!usuaria || !usuaria.activa) return "login";
  if (rol === "admin" && usuaria.rol !== "admin") return "permiso";
  if (rol === "equipo" && usuaria.rol !== "admin" && usuaria.rol !== "comercial") return "permiso";
  return "ok";
}

export type SeccionMarca = "resumen" | "tablero" | "leads" | "tareas" | "secuencias" | "conversaciones" | "condiciones";

/** Lo único que ve una usuaria con rol «cliente», y solo en su marca. */
export const SECCIONES_CLIENTE: readonly SeccionMarca[] = ["resumen", "tablero", "leads", "tareas"];

export function evaluarAccesoMarca(
  usuaria: { rol: string; activa: boolean; marca_id: string | null } | null,
  marcaId: string,
  seccion: SeccionMarca,
): Acceso {
  if (!usuaria || !usuaria.activa) return "login";
  // Lista cerrada: un rol que no conocemos no hereda el acceso total.
  if (usuaria.rol === "admin" || usuaria.rol === "comercial") return "ok";
  if (usuaria.rol !== "cliente") return "permiso";
  return usuaria.marca_id === marcaId && SECCIONES_CLIENTE.includes(seccion) ? "ok" : "permiso";
}
