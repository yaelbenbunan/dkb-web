// Client-safe: etiquetas y colores del estado del email de marca en el CRM.
export const EMAIL_STATUS_LABELS: Record<string, string> = {
  sent: "Enviado",
  delivered: "Entregado",
  bounced: "Rebotado",
  complained: "Spam",
};

export const EMAIL_STATUS_COLORS: Record<string, string> = {
  sent: "#64748b", // gris
  delivered: "#16a34a", // verde
  bounced: "#dc2626", // rojo
  complained: "#d97706", // ámbar
};

/** Etiqueta legible; null/desconocido → "—". */
export function emailStatusLabel(status: string | null): string {
  if (!status) return "—";
  return EMAIL_STATUS_LABELS[status] ?? "—";
}
