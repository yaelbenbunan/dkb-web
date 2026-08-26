// Agenda de seguimiento: convierte la fecha `followup_at` de cada lead en tramos
// ("vencidos", "hoy", "mañana"…) para que ninguna llamada pendiente se escape.
//
// Módulo puro y client-safe: no toca Supabase ni `server-only`, así que lo puede
// importar tanto el panel (cliente) como cualquier acción de servidor.

/** Zona horaria del negocio. Todo el cálculo de "hoy" se hace aquí. */
const TZ = "Europe/Madrid";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** ¿Es una fecha ISO de día (YYYY-MM-DD) que existe de verdad? */
export function isFollowupDate(value: string | null | undefined): boolean {
  const v = (value ?? "").trim();
  if (!ISO_DAY.test(v)) return false;
  // `new Date("2026-02-30")` no lanza: normaliza al 2 de marzo. Comparar el
  // resultado con la entrada descarta los días que no existen.
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

/** Día de hoy en Madrid como YYYY-MM-DD (el servidor corre en UTC). */
export function todayInMadrid(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Suma (o resta) días a una fecha YYYY-MM-DD. Se calcula en UTC a propósito:
 *  así los cambios de hora de marzo y octubre no desplazan el día. */
export function addDays(date: string, days: number): string {
  const base = new Date(`${date}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

export type AgendaBucketKey = "vencidos" | "hoy" | "manana" | "semana" | "despues";

/** Orden de aparición en la agenda: lo urgente primero. */
export const AGENDA_ORDER: AgendaBucketKey[] = [
  "vencidos",
  "hoy",
  "manana",
  "semana",
  "despues",
];

export const AGENDA_BUCKETS: Record<
  AgendaBucketKey,
  { label: string; color: string }
> = {
  vencidos: { label: "Vencidos", color: "#dc2626" },
  hoy: { label: "Hoy", color: "#ea580c" },
  manana: { label: "Mañana", color: "#d97706" },
  semana: { label: "Esta semana", color: "#0891b2" },
  despues: { label: "Más adelante", color: "#64748b" },
};

/** Tramo al que pertenece una fecha respecto a `today` (ambas YYYY-MM-DD). */
export function agendaBucket(date: string, today: string): AgendaBucketKey {
  if (date < today) return "vencidos";
  if (date === today) return "hoy";
  if (date === addDays(today, 1)) return "manana";
  if (date <= addDays(today, 7)) return "semana";
  return "despues";
}

/** Lo mínimo que necesita un lead para entrar en la agenda. */
export interface AgendaLead {
  followup_at: string | null;
  archived: boolean;
}

export interface AgendaGroup<T> {
  key: AgendaBucketKey;
  label: string;
  color: string;
  rows: T[];
}

/** Solo los leads llamables: activos y con una fecha válida. */
function schedulable<T extends AgendaLead>(rows: T[]): T[] {
  return rows.filter((r) => !r.archived && isFollowupDate(r.followup_at));
}

/** Agrupa los leads por tramo, ordenados por fecha ascendente dentro de cada
 *  uno. Los tramos vacíos no aparecen. */
export function buildAgenda<T extends AgendaLead>(
  rows: T[],
  today: string = todayInMadrid(),
): AgendaGroup<T>[] {
  const byBucket = new Map<AgendaBucketKey, T[]>();
  for (const row of schedulable(rows)) {
    const key = agendaBucket(row.followup_at!, today);
    const list = byBucket.get(key);
    if (list) list.push(row);
    else byBucket.set(key, [row]);
  }
  return AGENDA_ORDER.flatMap((key) => {
    const list = byBucket.get(key);
    if (!list?.length) return [];
    list.sort((a, b) => a.followup_at!.localeCompare(b.followup_at!));
    return [{ key, label: AGENDA_BUCKETS[key].label, color: AGENDA_BUCKETS[key].color, rows: list }];
  });
}

/** Cuántas llamadas están vencidas o tocan hoy — el número del chip de agenda. */
export function dueCount<T extends AgendaLead>(
  rows: T[],
  today: string = todayInMadrid(),
): number {
  return schedulable(rows).filter((r) => r.followup_at! <= today).length;
}
