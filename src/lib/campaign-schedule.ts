/** Reglas de la hora de un envío programado, compartidas por el formulario y
 *  la server action. */

/** Margen mínimo: el cron pasa cada 5 minutos, así que algo "para dentro de un
 *  minuto" saldría igual que "ahora" y confunde. */
export const MIN_LEAD_MINUTES = 5;
/** Tope razonable: más allá, la lista de destinatarios se queda vieja. */
export const MAX_AHEAD_DAYS = 90;

export function checkScheduleTime(
  value: string,
  now: Date = new Date(),
): { ok: true; iso: string } | { ok: false; error: string } {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) {
    return { ok: false, error: "Elige una fecha y hora de envío." };
  }
  const diffMs = date.getTime() - now.getTime();
  if (diffMs < MIN_LEAD_MINUTES * 60_000) {
    return { ok: false, error: `Programa el envío al menos ${MIN_LEAD_MINUTES} minutos en el futuro.` };
  }
  if (diffMs > MAX_AHEAD_DAYS * 86_400_000) {
    return { ok: false, error: `No se puede programar a más de ${MAX_AHEAD_DAYS} días vista.` };
  }
  return { ok: true, iso: date.toISOString() };
}

/** Fecha y hora legibles en hora de Madrid ("sáb, 20 sept, 10:30"). */
export function formatMadrid(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-ES", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Madrid",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
