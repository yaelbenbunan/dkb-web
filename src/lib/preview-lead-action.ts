"use server";

import { Resend } from "resend";
import { previewLeadSchema } from "./preview-validation";
import { generateLeadId } from "./preview-lead-id";
import { getSectorLabel } from "./preview-themes";

interface PreviewLeadResult {
  ok: boolean;
  leadId?: string;
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

export async function sendPreviewLead(
  formData: FormData,
): Promise<PreviewLeadResult> {
  const parsed = previewLeadSchema.safeParse({
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
    privacy: formData.get("privacy") ?? "",
    website: formData.get("website") ?? "",
    formLoadedAt: Number(formData.get("formLoadedAt")),
  });

  if (!parsed.success) {
    return { ok: false, error: "Revisa los campos del formulario." };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_EMAIL_TO;
  const from = process.env.CONTACT_EMAIL_FROM ?? "onboarding@resend.dev";
  if (!apiKey || !to) {
    console.error("Missing RESEND_API_KEY or CONTACT_EMAIL_TO");
    return { ok: false, error: "Servidor mal configurado. Inténtalo más tarde." };
  }

  const leadId = generateLeadId();
  const d = parsed.data;
  const tipo =
    d.businessType === "ecommerce"
      ? `Ecommerce — ${d.ecommerceKind}`
      : "Informativa";

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to,
    replyTo: d.email,
    subject: `Preview Web — ${d.name} (${tipo}) [#${leadId}]`,
    text: [
      `ID lead: ${leadId}`,
      "",
      "--- Contacto ---",
      `Nombre: ${d.name}`,
      `Email: ${d.email}`,
      `Teléfono: ${d.phone}`,
      "",
      "--- Respuestas ---",
      `Tipo de web: ${tipo}`,
      `Negocio: ${d.businessName} (sector: ${getSectorLabel(d.sector)})`,
      `Oferta: ${d.offerings.join(", ")}`,
      `Paleta: ${d.palette}`,
      `Tipografía: ${d.typography}`,
      "",
      "Toque personal:",
      d.valueProp,
      "",
      "Origen: /imagina-tu-web (paso 6).",
    ].join("\n"),
  });

  if (error) {
    console.error("Resend error:", error);
    return { ok: false, error: "No se pudo enviar. Inténtalo más tarde." };
  }
  return { ok: true, leadId };
}
