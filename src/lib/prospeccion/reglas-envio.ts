/**
 * Cuándo se le puede mandar un correo a un prospecto.
 *
 * Todo lo que frena un envío está aquí y es puro, para poder probarlo sin base
 * de datos ni Resend. Sin `server-only`: el panel usa `TEXTO_BLOQUEO`.
 */
import type { ProspectRow } from "./tipos";

const LIMITE_POR_DEFECTO = 30;

/** Correos de prospección por día natural. `0` es válido: para los envíos. */
export function limiteDiario(bruto: string | undefined = process.env.PROSPECT_DAILY_LIMIT): number {
  const n = Number(bruto);
  return bruto !== undefined && bruto.trim() !== "" && Number.isInteger(n) && n >= 0
    ? n
    : LIMITE_POR_DEFECTO;
}

/** Remitentes autorizados. Vacío si no hay nada configurado, y entonces no se
 *  envía: caer al remitente de las campañas mezclaría la reputación del dominio
 *  que usan los envíos con consentimiento. */
export function remitentesProspeccion(bruto: string | undefined = process.env.PROSPECT_SENDERS): string[] {
  return (bruto ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Medianoche de hoy en Madrid. Los dos días al año del cambio de hora se
 *  desvía una hora; para un tope de envíos no importa. */
export function inicioDelDiaMadrid(ahora: Date): Date {
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(ahora);
  const n = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value ?? 0);
  const transcurrido = (n("hour") * 3600 + n("minute") * 60 + n("second")) * 1000 + ahora.getMilliseconds();
  return new Date(ahora.getTime() - transcurrido);
}

export type MotivoBloqueo =
  | "estado"
  | "sin_email"
  | "suprimido"
  | "ya_es_lead"
  | "personal_sin_confirmar";

export const TEXTO_BLOQUEO: Record<MotivoBloqueo, string> = {
  estado: "No está pendiente de envío.",
  sin_email: "No tiene email.",
  suprimido: "Pidió no recibir más correos, o su dirección rebotó.",
  ya_es_lead: "Ya es un lead del CRM.",
  personal_sin_confirmar: "La dirección parece personal: envíalo de uno en uno y confírmalo.",
};

export function motivoBloqueo(
  p: Pick<ProspectRow, "status" | "email" | "email_kind">,
  ctx: { suprimidos: Set<string>; emailsDeLeads: Set<string>; confirmarPersonal: boolean },
): MotivoBloqueo | null {
  if (p.status !== "listo") return "estado";
  const email = (p.email ?? "").trim().toLowerCase();
  if (!email) return "sin_email";
  const dominio = email.split("@")[1] ?? "";
  if (ctx.suprimidos.has(email) || ctx.suprimidos.has(dominio)) return "suprimido";
  if (ctx.emailsDeLeads.has(email)) return "ya_es_lead";
  if (p.email_kind === "personal" && !ctx.confirmarPersonal) return "personal_sin_confirmar";
  return null;
}
