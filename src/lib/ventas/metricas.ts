/**
 * Cálculos de los paneles de ventas. Puro: recibe filas ya leídas y devuelve
 * números, así se prueba sin base de datos. Los meses y «hoy» se cuentan en
 * hora de Madrid, que es donde trabajan las comerciales.
 */

import { FASES, esFase, esFaseActiva, type Fase } from "./dominio";

const ZONA = "Europe/Madrid";

function fechaMadrid(d: Date): string {
  // en-CA formatea como YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function hoyMadrid(now: Date = new Date()): string {
  return fechaMadrid(now);
}

export function mesDe(iso: string): string {
  return fechaMadrid(new Date(iso)).slice(0, 7);
}

export function esMes(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
}

function desplazarMes(mes: string, delta: number): string {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function mesAnterior(mes: string): string {
  return desplazarMes(mes, -1);
}

export function mesSiguiente(mes: string): string {
  return desplazarMes(mes, 1);
}

export function nombreMes(mes: string): string {
  const [y, m] = mes.split("-").map(Number);
  return new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, 15)),
  );
}

/** Rango UTC holgado para pedir a la base la actividad de un mes; el filtro
 *  exacto (hora de Madrid) se hace después con `mesDe`. */
export function rangoConsultaMes(mes: string): { desde: string; hasta: string } {
  const [y, m] = mes.split("-").map(Number);
  const DIA = 86_400_000;
  return {
    desde: new Date(Date.UTC(y, m - 1, 1) - DIA).toISOString(),
    hasta: new Date(Date.UTC(y, m, 1) + DIA).toISOString(),
  };
}

/** «2026-09-20» → «20/09/2026». Para columnas `date`, sin zona horaria. */
export function formatoFecha(fecha: string): string {
  const [y, m, d] = fecha.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export function formatoFechaHora(iso: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: ZONA,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/* Embudo -------------------------------------------------------------------- */

export const ETAPAS_EMBUDO = ["contactado", "interesado", "muestras", "cliente"] as const;
export type EtapaEmbudo = (typeof ETAPAS_EMBUDO)[number];

/** Hasta dónde llega cada fase en el embudo. Las fases cerradas cuentan como
 *  «contactado»: para cerrar un lead alguien tuvo que hablar (o intentarlo). */
const RANGO: Record<Fase, number> = {
  nuevo: 0,
  fuera_de_perfil: 0,
  contactado: 1,
  volver_a_llamar: 1,
  perdido: 1,
  no_interesa: 1,
  ilocalizable: 1,
  interesado: 2,
  muestras: 3,
  cliente: 4,
};
const RANGO_ETAPA: Record<EtapaEmbudo, number> = { contactado: 1, interesado: 2, muestras: 3, cliente: 4 };

export interface Embudo {
  total: number;
  alcanzaron: Record<EtapaEmbudo, number>;
  porFase: Record<Fase, number>;
}

/**
 * Cuántos leads llegaron alguna vez a cada etapa. Se mira la fase actual y
 * todas las fases por las que pasó (entradas `cambio_fase` del historial):
 * alguien que recibió muestras y luego dijo que no sigue contando en «muestras».
 */
export function calcularEmbudo(
  leads: { id: string; fase: Fase }[],
  cambios: { lead_id: string; datos: Record<string, unknown> }[],
): Embudo {
  const maximo = new Map<string, number>();
  const porFase = Object.fromEntries(FASES.map((f) => [f, 0])) as Record<Fase, number>;
  // Los «fuera de perfil» se cuentan por fase (para saber cuánta lista se está
  // desperdiciando) pero quedan fuera del embudo: no eran nuestro público, así
  // que meterlos en el denominador hundiría la conversión sin decir nada útil.
  for (const lead of leads) {
    porFase[lead.fase]++;
    if (lead.fase === "fuera_de_perfil") continue;
    maximo.set(lead.id, RANGO[lead.fase]);
  }
  for (const cambio of cambios) {
    const fase = cambio.datos?.fase_nueva;
    const actual = maximo.get(cambio.lead_id);
    if (actual !== undefined && esFase(fase)) maximo.set(cambio.lead_id, Math.max(actual, RANGO[fase]));
  }
  const alcanzaron = { contactado: 0, interesado: 0, muestras: 0, cliente: 0 };
  for (const rango of maximo.values()) {
    for (const etapa of ETAPAS_EMBUDO) if (rango >= RANGO_ETAPA[etapa]) alcanzaron[etapa]++;
  }
  return { total: maximo.size, alcanzaron, porFase };
}

export function pctPaso(parte: number, total: number): number | null {
  return total > 0 ? Math.round((parte / total) * 100) : null;
}

/* Resumen del mes --------------------------------------------------------- */

export interface ResumenMes {
  leadsNuevos: number;
  llamadas: number;
  interesados: number;
  muestras: number;
  seguimientosAtrasados: number;
}

export function resumenMes(
  mes: string,
  leads: { created_at: string; fase: Fase; proximo_seguimiento: string | null }[],
  actividad: { tipo: string; datos: Record<string, unknown>; created_at: string }[],
  hoy: string,
): ResumenMes {
  const delMes = actividad.filter((a) => mesDe(a.created_at) === mes);
  return {
    leadsNuevos: leads.filter((l) => mesDe(l.created_at) === mes).length,
    llamadas: delMes.filter((a) => a.tipo === "llamada").length,
    interesados: delMes.filter((a) => a.tipo === "cambio_fase" && a.datos?.fase_nueva === "interesado").length,
    muestras: delMes.filter((a) => a.tipo === "muestras_enviadas").length,
    seguimientosAtrasados: leads.filter(
      (l) => esFaseActiva(l.fase) && l.proximo_seguimiento !== null && l.proximo_seguimiento < hoy,
    ).length,
  };
}

export function agruparSeguimientos<T extends { proximo_seguimiento: string | null }>(
  leads: T[],
  hoy: string,
): { atrasados: T[]; hoy: T[] } {
  const conFecha = leads.filter((l): l is T & { proximo_seguimiento: string } => l.proximo_seguimiento !== null);
  return {
    atrasados: conFecha
      .filter((l) => l.proximo_seguimiento < hoy)
      .sort((a, b) => a.proximo_seguimiento.localeCompare(b.proximo_seguimiento)),
    hoy: conFecha.filter((l) => l.proximo_seguimiento === hoy),
  };
}
