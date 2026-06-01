"use server";

import { Resend } from "resend";
import { previewLeadSchema } from "./preview-validation";
import { generateLeadId } from "./preview-lead-id";
import { getSectorLabel } from "./preview-themes";
import { mintFollowupToken } from "./preview-followup-token";

interface PreviewLeadResult {
  ok: boolean;
  leadId?: string;
  /** Short-lived HMAC authorizing the follow-up email to this lead's address. */
  followupToken?: string;
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

function parseCustomColors(raw: FormDataEntryValue | null): unknown {
  if (typeof raw !== "string" || !raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
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
    cuisine: formData.get("cuisine") || undefined,
    palette: formData.get("palette"),
    customColors: parseCustomColors(formData.get("customColors")),
    typography: formData.get("typography"),
    style: formData.get("style") || undefined,
    logoDataUrl: formData.get("logoDataUrl") ?? "",
    address: formData.get("address") ?? "",
    city: formData.get("city") ?? "",
    currentWebsite: formData.get("currentWebsite") ?? "",
    featuredDishes: parseOfferings(formData.get("featuredDishes")),
    valueProp: formData.get("valueProp"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    privacy: formData.get("privacy") ?? "",
    website: formData.get("website") ?? "",
    formLoadedAt: Number(formData.get("formLoadedAt")),
  });

  if (!parsed.success) {
    console.error(
      "[preview-lead] validation failed:",
      parsed.error.issues.map((i) => ({ path: i.path, code: i.code })),
    );
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
      `Paleta: ${d.palette}${
        d.customColors
          ? ` (custom: text ${d.customColors.text}, accent ${d.customColors.accent}, tint ${d.customColors.tint})`
          : ""
      }`,
      `Tipografía: ${d.typography}`,
      `Estilo: ${d.style ?? "moderno"}`,
      `Logo: ${d.logoDataUrl ? "sí (adjunto en data URL)" : "no"}`,
      `Dirección: ${d.address || "—"}`,
      `Ciudad: ${d.city || "—"}`,
      `Web actual: ${d.currentWebsite || "—"}`,
      `Platos destacados: ${
        d.featuredDishes && d.featuredDishes.length > 0
          ? d.featuredDishes.join(", ")
          : "—"
      }`,
      "",
      "Toque personal:",
      d.valueProp,
      "",
      "Origen: /imagina-tu-web.",
    ].join("\n"),
  });

  if (error) {
    console.error("Resend error:", error);
    return { ok: false, error: "No se pudo enviar. Inténtalo más tarde." };
  }
  return { ok: true, leadId, followupToken: mintFollowupToken(leadId, d.email) };
}
