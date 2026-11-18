/**
 * Los dos espacios del panel: **Dinkbit** (lo nuestro: nuestros leads, nuestra
 * captación, las altas) y **Clientes** (una carpeta por cliente). Más lo
 * personal (Mi día, Tareas) y los ajustes.
 *
 * Por debajo sigue siendo la misma tabla `ventas_marcas`: dinkbit es la marca
 * con slug `dinkbit` y toda otra marca es un cliente. Las direcciones
 * `/panel/ventas/<slug>/…` no cambian (las usan los correos y los avisos); lo
 * que cambia es cómo se agrupan en el menú.
 *
 * Diseño: docs/superpowers/specs/2026-11-18-panel-espacios-design.md. Puro.
 */

import { MARCA_DINKBIT_SLUG } from "./dominio";
import { seccionesDeRol, tieneProspeccion, type SeccionMarca } from "./rutas";

export function esMarcaPropia(slug: string): boolean {
  return slug === MARCA_DINKBIT_SLUG;
}

export type GrupoDinkbit = "leads" | "conversaciones" | "captacion";

/** Las secciones de dinkbit, agrupadas como en el menú lateral. Condiciones no
 *  está en ningún grupo: en dinkbit son ajustes (módulos, exclusiones, webhook). */
export const GRUPOS_DINKBIT: Readonly<Record<GrupoDinkbit, { texto: string; secciones: readonly SeccionMarca[] }>> = {
  leads: { texto: "Leads", secciones: ["resumen", "tablero", "leads", "tareas"] },
  conversaciones: { texto: "Conversaciones", secciones: ["conversaciones", "whatsapp"] },
  captacion: { texto: "Captación", secciones: ["secuencias", "campanas", "prospeccion"] },
};

/** Las pestañas de un cliente, en una sola fila y en este orden. */
const ORDEN_CLIENTE: readonly SeccionMarca[] = [
  "resumen",
  "tablero",
  "leads",
  "tareas",
  "conversaciones",
  "secuencias",
  "campanas",
  "condiciones",
  "whatsapp",
];

export const TEXTO_SECCION: Readonly<Record<SeccionMarca, string>> = {
  resumen: "Resumen",
  tablero: "Tablero",
  leads: "Tabla",
  tareas: "Tareas",
  secuencias: "Secuencias",
  conversaciones: "Conversaciones",
  whatsapp: "WhatsApp",
  campanas: "Mailing",
  prospeccion: "Prospección",
  condiciones: "Condiciones",
};

export function grupoDeSeccion(seccion: SeccionMarca): GrupoDinkbit | null {
  for (const [grupo, { secciones }] of Object.entries(GRUPOS_DINKBIT) as [GrupoDinkbit, (typeof GRUPOS_DINKBIT)[GrupoDinkbit]][]) {
    if (secciones.includes(seccion)) return grupo;
  }
  return null;
}

/**
 * Qué pestañas enseña la cabecera de una marca.
 *
 * - Dinkbit, para admin y comercial: solo las del grupo en el que estás (el
 *   menú lateral ya lleva a cada grupo). Sus Condiciones (módulos, exclusiones,
 *   webhook) se abren desde Ajustes, sin pestañas.
 * - Un cliente: todas en una fila.
 * - La clienta y la agente: sus secciones de siempre (`SECCIONES_POR_ROL`).
 *
 * Y siempre: Mailing solo con el módulo de campañas, Prospección solo donde la hay.
 */
export function pestanasVisibles(opciones: { slug: string; rol: string; activa: SeccionMarca; conCampanas: boolean }): SeccionMarca[] {
  const { slug, rol, activa, conCampanas } = opciones;
  const porRol = seccionesDeRol(rol);
  let lista: readonly SeccionMarca[];
  if (porRol) lista = ORDEN_CLIENTE.filter((s) => porRol.includes(s));
  // Condiciones de dinkbit (módulos, exclusiones, webhook) se abre desde Ajustes: página suelta, sin pestañas.
  else if (esMarcaPropia(slug)) lista = activa === "condiciones" ? [] : GRUPOS_DINKBIT[grupoDeSeccion(activa) ?? "leads"].secciones;
  else lista = ORDEN_CLIENTE;
  return lista.filter((s) => (s !== "campanas" || conCampanas) && (s !== "prospeccion" || tieneProspeccion(slug)));
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
  const partes = pathname.replace(/^\/panel\/ventas\/?/, "").split("/").filter(Boolean);
  const [primera, segunda] = partes;
  if (!primera) return FIJAS.hoy;
  if (Object.hasOwn(FIJAS, primera)) return FIJAS[primera];

  const seccion: SeccionMarca = segunda && Object.hasOwn(TEXTO_SECCION, segunda) ? (segunda as SeccionMarca) : "resumen";
  if (esMarcaPropia(primera)) {
    if (seccion === "condiciones") return { espacio: "ajustes", menu: "dinkbit:ajustes", migas: ["Ajustes", "Dinkbit"] };
    const grupo = grupoDeSeccion(seccion) ?? "leads";
    return { espacio: "dinkbit", menu: `dinkbit:${grupo}`, migas: ["Dinkbit", GRUPOS_DINKBIT[grupo].texto] };
  }
  const nombre = marcas.find((m) => m.slug === primera)?.nombre ?? primera;
  return { espacio: "clientes", menu: `cliente:${primera}`, migas: ["Clientes", nombre, TEXTO_SECCION[seccion]] };
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
