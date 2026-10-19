import type { BlocksFailureReason } from "./campaign-ai";
import { CAMPAIGN_NOT_CLAIMABLE } from "./campaign-send";

/**
 * Mensajes de error de campañas para quien usa el panel, compartidos por las
 * acciones del /panel viejo y las de /panel/ventas/<marca>/campanas.
 */

export const AI_FAILURE_MESSAGE: Record<BlocksFailureReason, string> = {
  "missing-api-key":
    "Falta configurar OPENAI_API_KEY en el servidor, así que no se llegó a llamar a la IA.",
  "api-error":
    "No se pudo contactar con OpenAI (API caída, clave inválida o sin saldo). Vuelve a intentarlo.",
  "invalid-response":
    "La IA devolvió una propuesta que no encaja con los bloques del email. Vuelve a intentarlo o reformula el concepto.",
};

/** Códigos de error del envío (`campaign-send.ts`) traducidos. */
const SEND_ERROR_MESSAGE: Record<string, string> = {
  missing_subject: "Falta el asunto.",
  from_email_not_allowed: "Ese email de envío no está autorizado.",
  invalid_blocks: "El correo no tiene contenido válido.",
  campaign_not_found: "Campaña no encontrada.",
  [CAMPAIGN_NOT_CLAIMABLE]:
    "La campaña ya se está enviando o está programada. Si está programada, cancela la programación antes de enviarla a mano.",
  modulo_inactivo: "El módulo de mailing no está activado en esta marca.",
  marca_not_found: "La marca de esta campaña ya no existe.",
};

export function sendErrorMessage(code: string | undefined, fallback: string): string {
  return (code && SEND_ERROR_MESSAGE[code]) || code || fallback;
}

export const SCHEDULE_ERROR_MESSAGE: Record<"not_schedulable" | "missing_migration" | "db_error", string> = {
  not_schedulable: "Solo se pueden programar campañas en borrador.",
  missing_migration:
    "Falta la migración de envíos programados en la base de datos (docs/sql/2026-09-16-campaign-schedule.sql).",
  db_error: "No se pudo programar la campaña.",
};

export function parseLeadIds(csv: string): string[] {
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
