/**
 * Filtros de canal y campaña del CRM de leads, compartidos entre la lista
 * (`/panel`) y el tablero (`/panel/tablero`). Puro (sin `server-only`): lo usa
 * tanto la página del tablero (servidor, con `searchParams`) como los
 * componentes de cliente (`LeadsTable`, `Tablero`).
 *
 * `channel`/`campaign` pueden venir `null` de Supabase (aún no atribuidos):
 * aquí siempre cuentan como el grupo «Sin canal» / «Sin campaña», nunca se
 * pierden ni se agrupan con un valor real por accidente.
 */

export const SIN_CANAL = "Sin canal";
export const SIN_CAMPANA = "Sin campaña";

/** Sentinela de "sin filtrar", igual al que ya usan los chips de estado en la lista. */
export const TODOS = "todos";

export interface LeadConCanalYCampana {
  channel: string | null;
  campaign: string | null;
}

/** Lo que ya se comparaba en la búsqueda libre de la lista y el tablero. */
export interface LeadBuscable {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  campaign?: string | null;
}

export function canalDeLead(lead: Pick<LeadConCanalYCampana, "channel">): string {
  return lead.channel?.trim() || SIN_CANAL;
}

export function campanaDeLead(lead: Pick<LeadConCanalYCampana, "campaign">): string {
  return lead.campaign?.trim() || SIN_CAMPANA;
}

export interface OpcionFiltro {
  valor: string;
  recuento: number;
}

function contarPorValor<T>(leads: readonly T[], valorDe: (lead: T) => string): OpcionFiltro[] {
  const recuentos = new Map<string, number>();
  for (const lead of leads) {
    const valor = valorDe(lead);
    recuentos.set(valor, (recuentos.get(valor) ?? 0) + 1);
  }
  return [...recuentos.entries()]
    .map(([valor, recuento]) => ({ valor, recuento }))
    .sort((a, b) => a.valor.localeCompare(b.valor, "es"));
}

/** Canales presentes en `leads`, con su recuento, ordenados alfabéticamente.
 *  Se calculan sobre el conjunto que se le pase: para que el recuento de cada
 *  chip refleje los demás filtros activos, pásale el resto de leads ya
 *  filtrados (por campaña, búsqueda…) menos el propio filtro de canal. */
export function opcionesDeCanal<T extends LeadConCanalYCampana>(leads: readonly T[]): OpcionFiltro[] {
  return contarPorValor(leads, canalDeLead);
}

/** Campañas presentes en `leads`, con su recuento. Misma lógica que
 *  {@link opcionesDeCanal} pero agrupando por campaña. */
export function opcionesDeCampana<T extends LeadConCanalYCampana>(leads: readonly T[]): OpcionFiltro[] {
  return contarPorValor(leads, campanaDeLead);
}

/** ¿Coincide `lead` con el texto de búsqueda `query`? Insensible a
 *  mayúsculas (como ya era en la lista y el tablero); compara nombre,
 *  teléfono, email y campaña. Vacío = coincide siempre. */
export function coincideBusqueda(lead: LeadBuscable, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [lead.name, lead.phone, lead.email, lead.campaign].some((v) => v?.toLowerCase().includes(q));
}

export interface FiltrosCanalCampana {
  /** Valor exacto de canal (incluye {@link SIN_CANAL}); `undefined` o {@link TODOS} = no filtra. */
  canal?: string;
  /** Valor exacto de campaña (incluye {@link SIN_CAMPANA}); `undefined` o {@link TODOS} = no filtra. */
  campana?: string;
  /** Texto de búsqueda libre; vacío o `undefined` = no filtra. */
  query?: string;
}

/** Aplica canal, campaña y búsqueda a la vez (se combinan con AND). No muta
 *  `leads`. El resto de criterios del panel (estado, archivados, "se les
 *  puede escribir", seguimiento atrasado…) son ortogonales a este filtro y
 *  se aplican fuera, antes o después, según cada pantalla. */
export function filtrarLeads<T extends LeadConCanalYCampana & LeadBuscable>(
  leads: readonly T[],
  filtros: FiltrosCanalCampana,
): T[] {
  const { canal, campana, query = "" } = filtros;
  return leads.filter(
    (lead) =>
      (!canal || canal === TODOS || canalDeLead(lead) === canal) &&
      (!campana || campana === TODOS || campanaDeLead(lead) === campana) &&
      coincideBusqueda(lead, query),
  );
}
