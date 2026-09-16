/** Rendimiento de una campaña a partir del estado de cada destinatario.
 *
 *  `campaign_recipients.status` guarda un único valor por destinatario, así que
 *  se trata como una escalera que solo sube: enviado → entregado → abierto →
 *  clic. Resend no garantiza el orden de los eventos (un `delivered` puede
 *  llegar después del `opened`), y si se pisara sin más se perderían aperturas.
 *  Rebote y queja no están en la escalera: mandan siempre. */

export const PROGRESS_STATUSES = ["pending", "sent", "delivered", "opened", "clicked"] as const;
export type ProgressStatus = (typeof PROGRESS_STATUSES)[number];

/** Estados que puede escribir un evento de Resend sobre un destinatario. */
export type RecipientEventStatus = "delivered" | "opened" | "clicked" | "bounced" | "complained";

/** Estados desde los que `next` puede avanzar, o null si se escribe siempre
 *  (rebote y queja). */
export function statusesBelow(next: RecipientEventStatus): string[] | null {
  const rank = PROGRESS_STATUSES.indexOf(next as ProgressStatus);
  if (rank < 0) return null;
  return PROGRESS_STATUSES.slice(0, rank);
}

export interface CampaignStats {
  /** Filas registradas (incluye las que fallaron al enviar). */
  total: number;
  /** Aceptados por Resend: todo lo que no es `failed` ni `pending`. */
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
  failed: number;
  /** Porcentajes sobre entregados (0–100, redondeados), null sin entregas. */
  openRate: number | null;
  clickRate: number | null;
}

export function summarizeRecipientStatuses(statuses: string[]): CampaignStats {
  const count = (...s: string[]) => statuses.filter((x) => s.includes(x)).length;
  const clicked = count("clicked");
  const opened = count("opened", "clicked");
  const delivered = count("delivered", "opened", "clicked");
  const failed = count("failed");
  const pending = count("pending");
  const pct = (n: number) => (delivered > 0 ? Math.round((n / delivered) * 100) : null);
  return {
    total: statuses.length,
    sent: statuses.length - failed - pending,
    delivered,
    opened,
    clicked,
    bounced: count("bounced"),
    complained: count("complained"),
    failed,
    openRate: pct(opened),
    clickRate: pct(clicked),
  };
}

/** Desde cuándo Resend registra aperturas y clics en dinkbit.es. Una campaña
 *  enviada antes no tiene esos datos, y enseñar "0 %" haría pensar que nadie
 *  la abrió. */
export const TRACKING_ENABLED_AT = "2026-09-16T09:12:00Z";

export function hasEngagementTracking(sentAt: string | null): boolean {
  return !sentAt || new Date(sentAt).getTime() >= new Date(TRACKING_ENABLED_AT).getTime();
}
