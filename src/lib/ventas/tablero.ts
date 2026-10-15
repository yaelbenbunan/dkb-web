/**
 * Reglas del tablero kanban de leads: qué columnas hay, qué fases agrupa cada
 * una, cuál es el siguiente paso de un lead y cómo se ordenan las tarjetas.
 * Puro (sin `server-only`): lo usan la página y el componente de cliente.
 */

import { FASE_LABELS, esFaseActiva, flujoDeMarca, type Fase } from "./dominio";
import type { Ahora } from "./metricas";

/** Una fase de columna («nuevo», «muestras», «propuesta»…), «descartados» u «otros». */
export type ColumnaId = string;

export interface ColumnaTablero {
  id: ColumnaId;
  titulo: string;
  /** Fases cuyas tarjetas se enseñan en la columna. */
  fases: readonly Fase[];
  /** Fase que recibe un lead soltado aquí. `null`: hay que elegirla (Descartados). */
  destino: Fase | null;
}

const BASE: readonly Fase[] = ["nuevo", "contactado", "volver_a_llamar", "interesado"];

/**
 * Columnas del tablero de una marca. Todas iguales salvo el paso avanzado:
 * «Muestras enviadas» en las marcas de producto, «Propuesta enviada» en
 * dinkbit (ver `flujoDeMarca`).
 */
export function columnasTablero(slug: string): ColumnaTablero[] {
  const paso = flujoDeMarca(slug).pasoAvanzado;
  return [
    ...[...BASE, paso].map((f) => ({ id: f, titulo: FASE_LABELS[f], fases: [f], destino: f })),
    { id: "cliente", titulo: "Cliente", fases: ["cliente"], destino: "cliente" },
    { id: "descartados", titulo: "Descartados", fases: ["perdido", "no_interesa", "ilocalizable"], destino: null },
  ];
}

/**
 * Reserva para los leads cuya fase no es de su marca (un dato antiguo, o una
 * marca que cambió de flujo): mejor verlos en una columna aparte que perderlos.
 * La vista solo la pinta si tiene tarjetas.
 */
export const COLUMNA_OTROS: ColumnaTablero = { id: "otros", titulo: "Otros", fases: [], destino: null };

/** Tarjetas que se pintan como mucho por columna; el resto se ve en la lista. */
export const MAX_TARJETAS_COLUMNA = 50;

/**
 * Columna donde se pinta un lead, o `null` si su fase está archivada y no se
 * enseña en el tablero (hoy, «Fuera de perfil»). Quien llame a esto tiene que
 * contemplar el nulo: antes se daba por hecho que toda fase tenía columna.
 */
export function columnaDeFase(fase: Fase, slug: string): ColumnaId | null {
  if (fase === "fuera_de_perfil") return null;
  return columnasTablero(slug).find((c) => c.fases.includes(fase))?.id ?? COLUMNA_OTROS.id;
}

/** Paso siguiente del botón «→». En Cliente y en las fases cerradas no hay. */
export function siguienteFase(fase: Fase, slug: string): Fase | null {
  const camino = flujoDeMarca(slug).camino;
  const i = camino.indexOf(fase);
  return i >= 0 && i < camino.length - 1 ? camino[i + 1] : null;
}

/**
 * Destinos del menú «Mover a…» de una tarjeta: las fases movibles salvo la
 * actual. Sirve tanto para leads activos (permite retroceder, algo que el
 * botón «→» no hace) como para leads descartados (permite recuperarlos).
 */
export function fasesDestino(actual: Fase, slug: string): Fase[] {
  return flujoDeMarca(slug).camino.filter((f) => f !== actual);
}

/**
 * Reparte los leads en sus columnas, conservando el orden de entrada. Los de
 * fases archivadas se quedan fuera del tablero a propósito: se ven en la lista
 * de leads, no aquí.
 */
export function agruparEnColumnas<T extends { fase: Fase }>(leads: T[], slug: string): Record<ColumnaId, T[]> {
  const grupos: Record<ColumnaId, T[]> = Object.fromEntries([...columnasTablero(slug), COLUMNA_OTROS].map((c) => [c.id, [] as T[]]));
  for (const lead of leads) {
    const columna = columnaDeFase(lead.fase, slug);
    if (columna) grupos[columna].push(lead);
  }
  return grupos;
}

export type EstadoSeguimiento = "atrasado" | "hoy" | "futuro";

/**
 * Una fecha (y hora opcional) frente a ahora. Sin hora, el día entero cuenta
 * como «hoy». La hora se recorta a HH:MM porque Postgres la devuelve con segundos.
 */
export function vencimiento(fecha: string | null, hora: string | null, ahora: Ahora): EstadoSeguimiento | null {
  if (!fecha) return null;
  if (fecha < ahora.fecha) return "atrasado";
  if (fecha > ahora.fecha) return "futuro";
  return hora && hora.slice(0, 5) < ahora.hora ? "atrasado" : "hoy";
}

/** Solo las fases activas llevan seguimiento. */
export function estadoSeguimiento(proximo: string | null, hora: string | null, fase: Fase, ahora: Ahora): EstadoSeguimiento | null {
  return esFaseActiva(fase) ? vencimiento(proximo, hora, ahora) : null;
}

/**
 * Lo urgente arriba: seguimientos atrasados (el más antiguo primero), luego los
 * de hoy (los que tienen hora, de más temprana a más tardía, antes que los de
 * día entero) y después el resto, del alta más reciente a la más antigua. No muta.
 */
export function ordenarPorUrgencia<T extends { fase: Fase; proximo_seguimiento: string | null; proximo_seguimiento_hora: string | null; created_at: string }>(
  leads: T[],
  ahora: Ahora,
): T[] {
  const peso = (l: T) => {
    const estado = estadoSeguimiento(l.proximo_seguimiento, l.proximo_seguimiento_hora, l.fase, ahora);
    return estado === "atrasado" ? 0 : estado === "hoy" ? 1 : 2;
  };
  const clave = (l: T) => `${l.proximo_seguimiento ?? "9999-12-31"}T${l.proximo_seguimiento_hora?.slice(0, 5) ?? "99:99"}`;
  return [...leads].sort((a, b) => {
    const pa = peso(a);
    const pb = peso(b);
    if (pa !== pb) return pa - pb;
    if (pa < 2) return clave(a).localeCompare(clave(b));
    return b.created_at.localeCompare(a.created_at);
  });
}

export interface RectanguloSimple {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * Dónde colocar (con `position: fixed`) el menú «⋯» de una tarjeta, anclado
 * por su borde derecho al botón que lo abre. Se abre hacia abajo si cabe; si
 * no, hacia arriba. Nunca queda por encima de `limiteSuperior` (el borde
 * inferior de la cabecera fija del panel) ni se sale del viewport por la
 * derecha o por abajo.
 */
export function calcularPosicionMenu(
  boton: RectanguloSimple,
  menu: { width: number; height: number },
  ventana: { width: number; height: number },
  limiteSuperior: number,
  margen = 4,
): { top: number; left: number } {
  const cabeDebajo = boton.bottom + margen + menu.height <= ventana.height;
  let top = cabeDebajo ? boton.bottom + margen : boton.top - margen - menu.height;
  if (top < limiteSuperior) top = limiteSuperior;
  if (top + menu.height > ventana.height) top = Math.max(limiteSuperior, ventana.height - menu.height);

  let left = boton.right - menu.width;
  if (left < 0) left = 0;
  if (left + menu.width > ventana.width) left = Math.max(0, ventana.width - menu.width);

  return { top, left };
}

/** «Paula Gómez» → «PG»; un solo nombre → su inicial. */
export function iniciales(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return "";
  const primera = (p: string) => Array.from(p)[0].toLocaleUpperCase("es-ES");
  return palabras.length === 1 ? primera(palabras[0]) : primera(palabras[0]) + primera(palabras[palabras.length - 1]);
}
