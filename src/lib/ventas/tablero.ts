/**
 * Reglas del tablero kanban de leads: qué columnas hay, qué fases agrupa cada
 * una, cuál es el siguiente paso de un lead y cómo se ordenan las tarjetas.
 * Puro (sin `server-only`): lo usan la página y el componente de cliente.
 */

import { esFaseActiva, type Fase } from "./dominio";

export type ColumnaId = "nuevo" | "contactado" | "interesado" | "muestras" | "cliente" | "descartados";

export interface ColumnaTablero {
  id: ColumnaId;
  titulo: string;
  /** Fases cuyas tarjetas se enseñan en la columna. */
  fases: readonly Fase[];
  /** Fase que recibe un lead soltado aquí. `null`: hay que elegirla (Descartados). */
  destino: Fase | null;
}

export const COLUMNAS_TABLERO: readonly ColumnaTablero[] = [
  { id: "nuevo", titulo: "Nuevo", fases: ["nuevo"], destino: "nuevo" },
  { id: "contactado", titulo: "Contactado", fases: ["contactado"], destino: "contactado" },
  { id: "interesado", titulo: "Interesado", fases: ["interesado"], destino: "interesado" },
  { id: "muestras", titulo: "Muestras enviadas", fases: ["muestras"], destino: "muestras" },
  { id: "cliente", titulo: "Cliente", fases: ["cliente"], destino: "cliente" },
  { id: "descartados", titulo: "Descartados", fases: ["perdido", "no_interesa", "ilocalizable"], destino: null },
];

/** Tarjetas que se pintan como mucho por columna; el resto se ve en la lista. */
export const MAX_TARJETAS_COLUMNA = 50;

export function columnaDeFase(fase: Fase): ColumnaId {
  return COLUMNAS_TABLERO.find((c) => c.fases.includes(fase))!.id;
}

const CAMINO: readonly Fase[] = ["nuevo", "contactado", "interesado", "muestras", "cliente"];

/** Paso siguiente del botón «→». En Cliente y en las fases cerradas no hay. */
export function siguienteFase(fase: Fase): Fase | null {
  const i = CAMINO.indexOf(fase);
  return i >= 0 && i < CAMINO.length - 1 ? CAMINO[i + 1] : null;
}

/** Fases entre las que se puede mover una tarjeta a mano, en el orden del camino principal. */
export const FASES_MOVIBLES: readonly Fase[] = CAMINO;

/**
 * Destinos del menú «Mover a…» de una tarjeta: las fases movibles salvo la
 * actual. Sirve tanto para leads activos (permite retroceder, algo que el
 * botón «→» no hace) como para leads descartados (permite recuperarlos).
 */
export function fasesDestino(actual: Fase): Fase[] {
  return FASES_MOVIBLES.filter((f) => f !== actual);
}

/** Reparte los leads en sus columnas, conservando el orden de entrada. */
export function agruparEnColumnas<T extends { fase: Fase }>(leads: T[]): Record<ColumnaId, T[]> {
  const grupos = Object.fromEntries(COLUMNAS_TABLERO.map((c) => [c.id, [] as T[]])) as Record<ColumnaId, T[]>;
  for (const lead of leads) grupos[columnaDeFase(lead.fase)].push(lead);
  return grupos;
}

export type EstadoSeguimiento = "atrasado" | "hoy" | "futuro";

/** Solo las fases activas llevan seguimiento; `hoy` es la fecha de Madrid (YYYY-MM-DD). */
export function estadoSeguimiento(proximo: string | null, fase: Fase, hoy: string): EstadoSeguimiento | null {
  if (!proximo || !esFaseActiva(fase)) return null;
  if (proximo < hoy) return "atrasado";
  return proximo === hoy ? "hoy" : "futuro";
}

/**
 * Lo urgente arriba: seguimientos atrasados (el más antiguo primero), luego los
 * de hoy y después el resto, del alta más reciente a la más antigua. No muta.
 */
export function ordenarPorUrgencia<T extends { fase: Fase; proximo_seguimiento: string | null; created_at: string }>(
  leads: T[],
  hoy: string,
): T[] {
  const peso = (l: T) => {
    const estado = estadoSeguimiento(l.proximo_seguimiento, l.fase, hoy);
    return estado === "atrasado" ? 0 : estado === "hoy" ? 1 : 2;
  };
  return [...leads].sort((a, b) => {
    const pa = peso(a);
    const pb = peso(b);
    if (pa !== pb) return pa - pb;
    if (pa === 0) return a.proximo_seguimiento!.localeCompare(b.proximo_seguimiento!);
    return b.created_at.localeCompare(a.created_at);
  });
}

/** «Paula Gómez» → «PG»; un solo nombre → su inicial. */
export function iniciales(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return "";
  const primera = (p: string) => Array.from(p)[0].toLocaleUpperCase("es-ES");
  return palabras.length === 1 ? primera(palabras[0]) : primera(palabras[0]) + primera(palabras[palabras.length - 1]);
}
