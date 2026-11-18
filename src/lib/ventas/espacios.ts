/**
 * Los dos espacios del panel: **Dinkbit** (lo nuestro: nuestros leads, nuestra
 * captación, las altas) y **Clientes** (una carpeta por cliente). Más lo
 * personal (Mi día, Tareas) y los ajustes.
 *
 * Por debajo sigue siendo la misma tabla `ventas_marcas`: dinkbit es la marca
 * con slug `dinkbit` y toda otra marca es un cliente. Las direcciones
 * `/panel/<slug>/…` no cambian (las usan los correos y los avisos); lo
 * que cambia es cómo se agrupan en el menú.
 *
 * Diseño: docs/superpowers/specs/2026-11-18-panel-espacios-design.md. Puro.
 */

import { MARCA_DINKBIT_SLUG } from "./dominio";
import { seccionesDeRol, tieneProspeccion, type SeccionMarca } from "./rutas";

export function esMarcaPropia(slug: string): boolean {
  return slug === MARCA_DINKBIT_SLUG;
}

export interface Grupo {
  clave: string;
  texto: string;
  /** La primera es adonde lleva el grupo. */
  secciones: readonly SeccionMarca[];
}

/**
 * Las secciones de dinkbit, agrupadas como en el menú lateral. Condiciones no
 * está en ningún grupo: en dinkbit son ajustes (módulos, exclusiones, webhook)
 * y se abre desde Ajustes.
 */
export const GRUPOS_DINKBIT: readonly Grupo[] = [
  { clave: "leads", texto: "Leads", secciones: ["resumen", "tablero", "leads", "tareas"] },
  { clave: "whatsapp", texto: "WhatsApp", secciones: ["conversaciones", "whatsapp", "secuencias"] },
  { clave: "captacion", texto: "Captación", secciones: ["campanas", "prospeccion"] },
];

/**
 * La carpeta de un cliente: primer nivel de pestañas (los grupos) y, si el
 * grupo tiene varias, un segundo nivel. WhatsApp junta la bandeja, la
 * conexión del número y las secuencias.
 */
export const GRUPOS_CLIENTE: readonly Grupo[] = [
  { clave: "ficha", texto: "Ficha", secciones: ["ficha"] },
  { clave: "tareas", texto: "Tareas", secciones: ["tareas"] },
  { clave: "leads", texto: "Leads", secciones: ["resumen", "tablero", "leads", "campanas"] },
  { clave: "whatsapp", texto: "WhatsApp", secciones: ["conversaciones", "whatsapp", "secuencias"] },
  { clave: "integraciones", texto: "Integraciones", secciones: ["condiciones"] },
];

export const TEXTO_SECCION: Readonly<Record<SeccionMarca, string>> = {
  ficha: "Ficha",
  resumen: "Resumen",
  tablero: "Tablero",
  leads: "Tabla",
  tareas: "Tareas",
  secuencias: "Secuencias",
  conversaciones: "Conversaciones",
  whatsapp: "Conexión",
  campanas: "Mailing",
  prospeccion: "Prospección",
  condiciones: "Integraciones",
};

export function gruposDe(slug: string): readonly Grupo[] {
  return esMarcaPropia(slug) ? GRUPOS_DINKBIT : GRUPOS_CLIENTE;
}

export function grupoDeSeccion(slug: string, seccion: SeccionMarca): Grupo | null {
  return gruposDe(slug).find((g) => g.secciones.includes(seccion)) ?? null;
}

/** La dirección de una sección de una marca. */
export function rutaSeccion(slug: string, seccion: SeccionMarca): string {
  return seccion === "resumen" ? `/panel/${slug}` : `/panel/${slug}/${seccion}`;
}

export interface Cabecera {
  /** Primer nivel: vacío en dinkbit para admin y comercial (lo hace el menú lateral). */
  grupos: { clave: string; texto: string; seccion: SeccionMarca; activo: boolean }[];
  /** Segundo nivel: las secciones del grupo activo, si tiene más de una. */
  secciones: SeccionMarca[];
}

/**
 * Las pestañas de la cabecera de una marca.
 *
 * - Un cliente: los grupos de `GRUPOS_CLIENTE` y, debajo, las secciones del activo.
 * - Dinkbit, para admin y comercial: solo las secciones del grupo (el menú
 *   lateral lleva a cada grupo). Sus Condiciones van sueltas, sin pestañas.
 * - La clienta y la agente: lo mismo, recortado a sus secciones (`SECCIONES_POR_ROL`).
 *
 * Y siempre: Mailing solo con el módulo de campañas, Prospección solo donde la
 * hay, y WhatsApp solo con el servicio marcado en la ficha (`conWhatsApp`).
 */
export function cabeceraMarca(opciones: { slug: string; rol: string; activa: SeccionMarca; conCampanas: boolean; conWhatsApp?: boolean }): Cabecera {
  const { slug, rol, activa, conCampanas, conWhatsApp = true } = opciones;
  const porRol = seccionesDeRol(rol);
  const visible = (s: SeccionMarca) =>
    (!porRol || porRol.includes(s)) && (s !== "campanas" || conCampanas) && (s !== "prospeccion" || tieneProspeccion(slug));
  const grupos = gruposDe(slug)
    .map((g) => ({ ...g, secciones: g.secciones.filter(visible) }))
    .filter((g) => g.secciones.length > 0)
    // WhatsApp es un servicio: el equipo solo ve la pestaña en los clientes que lo
    // tienen marcado. La clienta y la agente, que entran a eso, la ven siempre.
    .filter((g) => g.clave !== "whatsapp" || conWhatsApp || !!porRol);
  const actual = grupos.find((g) => g.secciones.includes(activa)) ?? null;
  const conMenuLateral = esMarcaPropia(slug) && !porRol;
  return {
    grupos: conMenuLateral
      ? []
      : grupos.map((g) => ({ clave: g.clave, texto: g.texto, seccion: g.secciones[0], activo: g.clave === actual?.clave })),
    secciones: actual && actual.secciones.length > 1 ? [...actual.secciones] : [],
  };
}

/** Reparte una lista entre lo nuestro y lo de los clientes. Sin marca conocida, a clientes: que no se pierda. */
export function separarPorEspacio<T>(items: readonly T[], slugDe: (item: T) => string | null | undefined): { dinkbit: T[]; clientes: T[] } {
  const dinkbit: T[] = [];
  const clientes: T[] = [];
  for (const item of items) {
    const slug = slugDe(item);
    (slug && esMarcaPropia(slug) ? dinkbit : clientes).push(item);
  }
  return { dinkbit, clientes };
}

/**
 * El filtro de la vista global de Tareas. `ambito`: vacío (todas), «dinkbit»,
 * «clientes» (todas las que no son nuestras) o el slug de un cliente.
 */
export function filtrarTareasGlobal<T extends { asignadaA: string | null; slug: string | null }>(
  tareas: readonly T[],
  filtro: { yo: string; ambito?: string; soloMias?: boolean },
): T[] {
  return tareas.filter((t) => {
    if (filtro.soloMias && t.asignadaA !== filtro.yo) return false;
    if (!filtro.ambito) return true;
    const propia = t.slug !== null && esMarcaPropia(t.slug);
    if (filtro.ambito === "clientes") return !propia;
    return t.slug === filtro.ambito;
  });
}

export type Espacio = "personal" | "dinkbit" | "clientes" | "ajustes";

export interface Ubicacion {
  espacio: Espacio;
  /** La entrada del menú que se resalta: «hoy», «tareas», «dinkbit:<grupo>», «altas», «clientes», «cliente:<slug>», «usuarias», «dinkbit:ajustes». */
  menu: string;
  /** Lo que dice la barra de arriba, de lo general a lo concreto. */
  migas: string[];
}

/** Rutas de primer nivel que no son una marca. */
const FIJAS: Readonly<Record<string, Ubicacion>> = {
  hoy: { espacio: "personal", menu: "hoy", migas: ["Mi día"] },
  tareas: { espacio: "personal", menu: "tareas", migas: ["Tareas"] },
  altas: { espacio: "dinkbit", menu: "altas", migas: ["Dinkbit", "Altas"] },
  clientes: { espacio: "clientes", menu: "clientes", migas: ["Clientes", "Todos"] },
  usuarias: { espacio: "ajustes", menu: "usuarias", migas: ["Ajustes", "Usuarios"] },
};

/** Dónde estás, a partir de la dirección. Lo usan el menú lateral y la barra de arriba. */
export function ubicacion(pathname: string, marcas: readonly { slug: string; nombre: string }[]): Ubicacion {
  const partes = pathname.replace(/^\/panel\/?/, "").split("/").filter(Boolean);
  const [primera, segunda] = partes;
  if (!primera) return FIJAS.hoy;
  if (Object.hasOwn(FIJAS, primera)) return FIJAS[primera];

  const seccion: SeccionMarca = segunda && Object.hasOwn(TEXTO_SECCION, segunda) ? (segunda as SeccionMarca) : "resumen";
  if (esMarcaPropia(primera) && seccion === "condiciones") return { espacio: "ajustes", menu: "dinkbit:ajustes", migas: ["Ajustes", "Dinkbit"] };
  const grupo = grupoDeSeccion(primera, seccion) ?? gruposDe(primera)[0];
  const detalle = grupo.secciones.length > 1 ? [grupo.texto, TEXTO_SECCION[seccion]] : [grupo.texto];
  if (esMarcaPropia(primera)) return { espacio: "dinkbit", menu: `dinkbit:${grupo.clave}`, migas: ["Dinkbit", ...detalle] };
  const nombre = marcas.find((m) => m.slug === primera)?.nombre ?? primera;
  return { espacio: "clientes", menu: `cliente:${primera}`, migas: ["Clientes", nombre, ...detalle] };
}

/** Colores para distinguir a los clientes en el menú. Ninguno es el azul de dinkbit. */
const COLORES_CLIENTE = ["#6d28d9", "#0f766e", "#b45309", "#be185d", "#4d7c0f", "#0e7490", "#9333ea", "#c2410c"] as const;
export const COLOR_DINKBIT = "#1557b8";

/** El color de un cliente: sale de su slug, así no cambia entre visitas ni hace falta guardarlo. */
export function colorDeCliente(slug: string): string {
  let h = 0;
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COLORES_CLIENTE[h % COLORES_CLIENTE.length];
}

/**
 * Los clientes que salen en el menú lateral de una persona: los que ha
 * anclado, en el orden de la lista. Sin la columna `clientes_anclados`
 * (migración pendiente, `anclados` llega undefined), todos.
 */
export function clientesDelMenu<T extends { id: string }>(clientes: readonly T[], anclados: readonly string[] | null | undefined): { lista: T[]; conAnclaje: boolean } {
  if (!Array.isArray(anclados)) return { lista: [...clientes], conAnclaje: false };
  const set = new Set(anclados);
  return { lista: clientes.filter((c) => set.has(c.id)), conAnclaje: true };
}

/**
 * ¿Enseña la marca la pestaña WhatsApp? Dinkbit, siempre. Un cliente, si tiene
 * marcado el servicio en su ficha. Sin la columna `servicios` (migración
 * pendiente), como antes: sí.
 */
export function tieneWhatsApp(marca: { slug: string; servicios?: string[] | null }, servicioWhatsApp: string): boolean {
  if (esMarcaPropia(marca.slug) || !Array.isArray(marca.servicios)) return true;
  return marca.servicios.includes(servicioWhatsApp);
}

/** Anclar o soltar un cliente: la lista nueva, sin repetidos. */
export function alternarAnclado(anclados: readonly string[], id: string): string[] {
  return anclados.includes(id) ? anclados.filter((x) => x !== id) : [...new Set([...anclados, id])];
}
