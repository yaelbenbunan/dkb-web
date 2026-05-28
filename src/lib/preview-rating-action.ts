"use server";

import { Resend } from "resend";
import { previewRatingSchema } from "./preview-validation";
import { getSectorLabel } from "./preview-themes";

interface PreviewRatingResult {
  ok: boolean;
  error?: string;
}

function parseOfferings(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== "string" || !raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((v): v is string => typeof v === "string");
  } catch {
    return [];
  }
}

export async function sendPreviewRating(
  formData: FormData,
): Promise<PreviewRatingResult> {
  const parsed = previewRatingSchema.safeParse({
    businessType: formData.get("businessType"),
    ecommerceKind: formData.get("ecommerceKind") || undefined,
    businessName: formData.get("businessName"),
    sector: formData.get("sector"),
    offerings: parseOfferings(formData.get("offerings")),
    palette: formData.get("palette"),
    typography: formData.get("typography"),
    valueProp: formData.get("valueProp"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    leadId: formData.get("leadId"),
    rating: formData.get("rating"),
    comment: formData.get("comment") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, error: "Datos del rating inválidos." };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_EMAIL_TO;
  const from = process.env.CONTACT_EMAIL_FROM ?? "onboarding@resend.dev";
  if (!apiKey || !to) {
    console.error("Missing RESEND_API_KEY or CONTACT_EMAIL_TO");
    return { ok: false, error: "Servidor mal configurado." };
  }

  const d = parsed.data;
  const tipo =
    d.businessType === "ecommerce"
      ? `Ecommerce — ${d.ecommerceKind}`
      : "Informativa";
  const emoji = d.rating === "up" ? "👍" : "👎";

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to,
    replyTo: d.email,
    subject: `Rating Preview — ${emoji} — ${d.name} [#${d.leadId}]`,
    text: [
      `ID lead: ${d.leadId}`,
      `Rating: ${emoji} (${d.rating})`,
      "",
      "Comentario:",
      d.comment || "(sin comentario)",
      "",
      "--- Datos del lead (repetidos) ---",
      `Nombre: ${d.name}`,
      `Email: ${d.email}`,
      `Teléfono: ${d.phone}`,
      `Tipo de web: ${tipo}`,
      `Negocio: ${d.businessName} (sector: ${getSectorLabel(d.sector)})`,
      `Oferta: ${d.offerings.join(", ")}`,
      `Paleta: ${d.palette}`,
      `Tipografía: ${d.typography}`,
      "",
      "Toque personal:",
      d.valueProp,
    ].join("\n"),
  });

  if (error) {
    console.error("Resend error:", error);
    return { ok: false, error: "No se pudo enviar el rating." };
  }
  return { ok: true };
}
