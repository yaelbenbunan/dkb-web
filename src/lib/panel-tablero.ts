/**
 * Reglas del tablero kanban del CRM de leads: qué columnas agrupan los 9
 * estados de `lead-status.ts` (que no cambian; dos de ellos, `kit-digital` y
 * `cliente-kit-digital`, no tienen columna a propósito — ver
 * `ESTADOS_FUERA_DEL_TABLERO`), a qué columna pertenece un estado, cuál es el
 * siguiente paso del botón «→» y cómo se ordenan las tarjetas. Puro (sin
 * `server-only`): lo usan la página y el componente de cliente.
 *
 * Adrede independiente de `panel/ventas/_componentes` y `lib/ventas/tablero`:
 * son módulos de otra app dentro del mismo repo y pueden cambiar sin avisar.
 * `calcularPosicionMenu` e `iniciales` están duplicadas a propósito (son
 * utilidades genéricas, sin nada de "estado" de lead) en vez de importarlas de
 * `lib/ventas/tablero`. `hoyMadrid`/`formatoFecha` sí se reutilizan desde
 * `lib/ventas/metricas` (ver `Tablero.tsx`): el brief autoriza explícitamente
 * cualquiera de las dos opciones y duplicar esas sí que no aporta nada.
 */

import { LEAD_STATUSES, type LeadStatus } from "./lead-status";

export type ColumnaId = "nuevo" | "contactado" | "propuesta" | "ganado" | "descartados";

export interface ColumnaTablero {
  id: ColumnaId;
  titulo: string;
  /** Estados cuyas tarjetas se enseñan en la columna. */
  estados: readonly LeadStatus[];
  /** Estado que recibe un lead soltado aquí. `null`: hay que elegirlo (columna con varios estados). */
  destino: LeadStatus | null;
}

export const COLUMNAS_TABLERO: readonly ColumnaTablero[] = [
  { id: "nuevo", titulo: "Nuevo", estados: ["nuevo"], destino: "nuevo" },
  { id: "contactado", titulo: "Contactado", estados: ["contactado", "seguimiento"], destino: null },
  { id: "propuesta", titulo: "Propuesta", estados: ["propuesta"], destino: "propuesta" },
  { id: "ganado", titulo: "Ganado", estados: ["ganado"], destino: "ganado" },
  { id: "descartados", titulo: "Descartados", estados: ["ilocalizable", "perdido"], destino: null },
];

/** Tarjetas que se pintan como mucho por columna; el resto se ve en la lista. */
export const MAX_TARJETAS_COLUMNA = 50;

/** `kit-digital` y `cliente-kit-digital` ya no tienen columna: ese estado se
 *  gestiona desde la lista de `/panel`, no desde el tablero. Se usa para
 *  dejarlos fuera tanto del reparto en columnas como del contador de arriba. */
export const ESTADOS_FUERA_DEL_TABLERO: readonly LeadStatus[] = ["kit-digital", "cliente-kit-digital"];

/** `null` cuando el estado no tiene columna en el tablero (ver `ESTADOS_FUERA_DEL_TABLERO`). */
export function columnaDeEstado(estado: LeadStatus): ColumnaId | null {
  return COLUMNAS_TABLERO.find((c) => c.estados.includes(estado))?.id ?? null;
}

/** Reparte los leads en sus columnas, conservando el orden de entrada. Los
 *  leads sin columna (`ESTADOS_FUERA_DEL_TABLERO`) se descartan: no aparecen
 *  en el tablero. */
export function agruparEnColumnas<T extends { estado: LeadStatus }>(leads: T[]): Record<ColumnaId, T[]> {
  const grupos = Object.fromEntries(COLUMNAS_TABLERO.map((c) => [c.id, [] as T[]])) as Record<ColumnaId, T[]>;
  for (const lead of leads) {
    const columna = columnaDeEstado(lead.estado);
    if (columna) grupos[columna].push(lead);
  }
  return grupos;
}

/** Camino principal del botón «→»: solo estas cuatro columnas encadenan.
 *  Descartados es una rama aparte (como "perdido" en ventas): solo se llega
 *  a ella por el menú «⋯», nunca con «→». Kit Digital ni siquiera es una
 *  columna: no tiene botón «→» posible. */
const CAMINO_COLUMNAS: readonly ColumnaId[] = ["nuevo", "contactado", "propuesta", "ganado"];

/**
 * Paso siguiente del botón «→», como estado concreto (no solo columna): en
 * las columnas con un único estado no hay ambigüedad; en «Contactado» (que
 * agrupa `contactado` y `seguimiento`) el destino es su estado por defecto,
 * el primero de la lista. Null en Ganado (última del camino), en Descartados
 * y en los estados sin columna (`kit-digital`, `cliente-kit-digital`).
 */
export function siguienteColumna(estado: LeadStatus): LeadStatus | null {
  const actual = columnaDeEstado(estado);
  const i = actual ? CAMINO_COLUMNAS.indexOf(actual) : -1;
  if (i < 0 || i >= CAMINO_COLUMNAS.length - 1) return null;
  const siguiente = COLUMNAS_TABLERO.find((c) => c.id === CAMINO_COLUMNAS[i + 1])!;
  return siguiente.estados[0];
}

/** Destinos del menú «⋯ Mover a…»: cualquier otro estado, en el orden de
 *  `LEAD_STATUSES`. Incluye Kit Digital y Cliente Kit Digital aunque no
 *  tengan columna: hay que poder mandar allí a quien muestre interés, para
 *  tenerlos localizados cuando vuelva la convocatoria. Al hacerlo, la
 *  tarjeta desaparece del tablero (sigue en la lista de `/panel`), y el menú
 *  lo avisa antes de que alguien lo descubra por las malas. */
export function estadosDestino(actual: LeadStatus): LeadStatus[] {
  return LEAD_STATUSES.filter((s) => s !== actual);
}

/** Si mover a este estado saca la tarjeta del tablero. */
export function saleDelTablero(estado: LeadStatus): boolean {
  return ESTADOS_FUERA_DEL_TABLERO.includes(estado);
}

/** Estados en los que ya no se espera ninguna acción más: no llevan
 *  seguimiento aunque tengan una fecha guardada de antes. */
const ESTADOS_CERRADOS: readonly LeadStatus[] = ["ganado", "perdido", "ilocalizable", "cliente-kit-digital"];

function esEstadoActivo(estado: LeadStatus): boolean {
  return !ESTADOS_CERRADOS.includes(estado);
}

export type EstadoSeguimiento = "atrasado" | "hoy" | "futuro";

/** Solo los estados activos llevan seguimiento; `hoy` es la fecha de Madrid (YYYY-MM-DD). */
export function estadoSeguimiento(proximo: string | null, estado: LeadStatus, hoy: string): EstadoSeguimiento | null {
  if (!proximo || !esEstadoActivo(estado)) return null;
  if (proximo < hoy) return "atrasado";
  return proximo === hoy ? "hoy" : "futuro";
}

/**
 * Lo urgente arriba: seguimientos atrasados (el más antiguo primero), luego los
 * de hoy y después el resto, del alta más reciente a la más antigua. No muta.
 */
export function ordenarPorUrgencia<T extends { estado: LeadStatus; followup_at: string | null; created_at: string }>(
  leads: T[],
  hoy: string,
): T[] {
  const peso = (l: T) => {
    const estado = estadoSeguimiento(l.followup_at, l.estado, hoy);
    return estado === "atrasado" ? 0 : estado === "hoy" ? 1 : 2;
  };
  return [...leads].sort((a, b) => {
    const pa = peso(a);
    const pb = peso(b);
    if (pa !== pb) return pa - pb;
    if (pa === 0) return a.followup_at!.localeCompare(b.followup_at!);
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
 * derecha o por abajo. Duplicado a propósito de `lib/ventas/tablero`: ver la
 * nota de cabecera del fichero.
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

/** «Paula Gómez» → «PG»; un solo nombre → su inicial. Duplicado a propósito
 *  de `lib/ventas/tablero`: ver la nota de cabecera del fichero. */
export function iniciales(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return "";
  const primera = (p: string) => Array.from(p)[0].toLocaleUpperCase("es-ES");
  return palabras.length === 1 ? primera(palabras[0]) : primera(palabras[0]) + primera(palabras[palabras.length - 1]);
}
