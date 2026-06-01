"use server";

import { previewLeadSchema } from "./preview-validation";
import { generateLeadId } from "./preview-lead-id";
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

/**
 * Validates the wizard answers and mints a lead id + follow-up token. It does
 * NOT send the internal email anymore: that single notification (answers + the
 * preview PDF) is sent once from `sendPreviewFollowup`, after the preview has
 * rendered and been captured. This keeps the team to ONE email per lead.
 */
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

  const leadId = generateLeadId();
  return {
    ok: true,
    leadId,
    followupToken: mintFollowupToken(leadId, parsed.data.email),
  };
}
