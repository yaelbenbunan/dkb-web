/**
 * Qué significa que a un lead se le pueda mandar una campaña.
 *
 * Vive aparte porque la condición se aplica en dos sitios que no pueden
 * importarse entre sí: la consulta de `listEmailableLeads()` (servidor, SQL) y
 * el filtro del panel (cliente). Si cada uno llevara su propia versión, el CRM
 * acabaría enseñando un recuento distinto del que luego recibe el envío, y el
 * error no se notaría hasta mandar una campaña de menos, o de más.
 */

/** Estados de Resend que inhabilitan a un lead para futuros envíos. */
export const BLOCKING_EMAIL_STATUSES = ["bounced", "complained"] as const;

export interface EmailableLead {
  email: string | null;
  consent: boolean | null;
  email_status: string | null;
}

/**
 * Tres condiciones, todas necesarias:
 *
 * - `consent === true`: consentimiento explícito. `null` (nunca se preguntó) y
 *   `false` (se preguntó y dijo que no) quedan igual de fuera.
 * - Con email: sin dirección no hay nada que enviar.
 * - Sin rebote ni queja: seguir escribiendo a quien rebota o te ha marcado como
 *   spam quema la reputación del dominio y perjudica al resto de envíos.
 */
export function isLeadEmailable(lead: EmailableLead): boolean {
  if (lead.consent !== true) return false;
  if (!lead.email || !lead.email.trim()) return false;
  if (lead.email_status && BLOCKING_EMAIL_STATUSES.includes(lead.email_status as (typeof BLOCKING_EMAIL_STATUSES)[number])) {
    return false;
  }
  return true;
}
