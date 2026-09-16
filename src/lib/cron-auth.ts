import { timingSafeEqual } from "node:crypto";

/** Comprueba la cabecera `Authorization: Bearer <CRON_SECRET>` que trae cada
 *  llamada del cron. Comparación en tiempo constante. */
export function isAuthorizedCronRequest(header: string | null, secret: string): boolean {
  if (!header || !secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  return received.length === expected.length && timingSafeEqual(received, expected);
}
