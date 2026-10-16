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

/** A quién se le puede asignar un lead o una tarea de una marca. Una clienta solo
 *  de la suya: si no, vería (y podría asignarse) nombres de otras marcas. */
export function esAsignableEnMarca(usuaria: { rol: string; activa: boolean; marca_id: string | null }, marcaId: string): boolean {
  if (!usuaria.activa) return false;
  if (usuaria.rol === "admin" || usuaria.rol === "comercial") return true;
  return usuaria.rol === "cliente" && usuaria.marca_id === marcaId;
}

export type SeccionMarca = "resumen" | "tablero" | "leads" | "tareas" | "secuencias" | "conversaciones" | "condiciones" | "prospeccion";

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

/**
 * Marcas con pestaña de Prospección. Solo dinkbit: los remitentes
 * (`PROSPECT_SENDERS`), el pie legal y la página de baja hablan en su nombre, y
 * las tablas `prospect_*` no tienen marca. Abrirla a otra marca pide todo eso
 * por marca (docs/superpowers/specs/2026-10-16-ventas-prospeccion-design.md).
 * La clienta no la ve en ningún caso: no está en `SECCIONES_CLIENTE`.
 */
export const MARCAS_CON_PROSPECCION: readonly string[] = ["dinkbit"];

export function tieneProspeccion(slug: string): boolean {
  return MARCAS_CON_PROSPECCION.includes(slug);
}
