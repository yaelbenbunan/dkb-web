"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  checkCredentials,
  createSessionToken,
  PANEL_COOKIE,
} from "@/lib/panel-auth";
import {
  updateLeadStatus,
  updateLeadField,
  updateLeadFollowupDate,
  archiveLeads,
  deleteLeads,
  createManualLead,
  createLeadsBulk,
  listLeadContacts,
  listLeads,
  setLeadConsent,
  LEAD_STATUSES,
  type LeadStatus,
} from "@/lib/imagina-leads";
import { ACCOUNT_MANAGERS } from "@/lib/account-managers";
import { dedupeKey, parseLeadsCsv, type CsvRowError } from "@/lib/leads-csv";
import { sendKitDigital2026Email } from "@/lib/kit-digital-2026-resend";

export async function panelLogin(formData: FormData) {
  const user = String(formData.get("user") ?? "");
  const pass = String(formData.get("password") ?? "");
  const nextRaw = String(formData.get("next") ?? "/panel");
  const next = nextRaw.startsWith("/panel") ? nextRaw : "/panel";

  if (!checkCredentials(user, pass)) {
    redirect(`/panel/login?error=1&next=${encodeURIComponent(next)}`);
  }
  const token = await createSessionToken();
  if (!token) redirect(`/panel/login?error=2&next=${encodeURIComponent(next)}`);

  (await cookies()).set(PANEL_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/panel",
    maxAge: 12 * 60 * 60,
  });
  redirect(next);
}

export async function panelLogout() {
  (await cookies()).delete({ name: PANEL_COOKIE, path: "/panel" });
  redirect("/panel/login");
}

export async function setLeadStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (id && LEAD_STATUSES.includes(status as LeadStatus)) {
    await updateLeadStatus(id, status as LeadStatus);
    revalidatePath("/panel");
  }
}

export async function setLeadAccountManager(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const am = String(formData.get("account_manager") ?? "");
  // Empty string clears the assignment; otherwise must be a known manager.
  if (id && (am === "" || ACCOUNT_MANAGERS.includes(am as never))) {
    await updateLeadField(id, "account_manager", am);
    revalidatePath("/panel");
  }
}

export async function setLeadNotes(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (id) {
    await updateLeadField(id, "notes", String(formData.get("notes") ?? ""));
    revalidatePath("/panel");
  }
}

export async function setLeadFollowup(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (id) {
    await updateLeadField(id, "followup", String(formData.get("followup") ?? ""));
    revalidatePath("/panel");
  }
}

/** Agenda la próxima llamada. Valor vacío = quitar de la agenda. */
export async function setLeadFollowupDate(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (id) {
    await updateLeadFollowupDate(id, String(formData.get("followup_at") ?? ""));
    revalidatePath("/panel");
  }
}

export async function setLeadChannel(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (id) {
    await updateLeadField(id, "channel", String(formData.get("channel") ?? ""));
    revalidatePath("/panel");
  }
}

export async function setLeadCampaign(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (id) {
    await updateLeadField(id, "campaign", String(formData.get("campaign") ?? ""));
    revalidatePath("/panel");
  }
}

export async function setLeadName(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (id) {
    await updateLeadField(id, "name", String(formData.get("name") ?? ""));
    revalidatePath("/panel");
  }
}

export async function setLeadEmail(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (id) {
    await updateLeadField(id, "email", String(formData.get("email") ?? ""));
    revalidatePath("/panel");
  }
}

export async function setLeadPhone(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (id) {
    await updateLeadField(id, "phone", String(formData.get("phone") ?? ""));
    revalidatePath("/panel");
  }
}

export async function createLeadAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  // Un lead necesita al menos un dato para poder contactar/identificarlo.
  if (!name && !phone && !email) {
    return { ok: false, error: "Añade al menos nombre, teléfono o email." };
  }
  const res = await createManualLead({
    name,
    phone,
    email,
    website: String(formData.get("website") ?? ""),
    channel: String(formData.get("channel") ?? ""),
    campaign: String(formData.get("campaign") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
  if (!res.ok) {
    return { ok: false, error: "No se pudo crear el lead. Inténtalo de nuevo." };
  }
  revalidatePath("/panel");
  return { ok: true };
}

export interface ImportLeadsResult {
  ok: boolean;
  /** Leads dados de alta. */
  inserted: number;
  /** Filas descartadas por coincidir con un lead que ya está en el CRM. */
  duplicates: number;
  /** Filas descartadas por el propio fichero (formato, estado desconocido…). */
  errors: CsvRowError[];
  error?: string;
}

/**
 * Importación masiva desde CSV. Recibe el texto crudo del fichero y lo vuelve a
 * parsear en el servidor: la previsualización del panel es solo información
 * para quien sube el fichero, nunca la fuente de lo que se inserta.
 */
export async function importLeadsAction(formData: FormData): Promise<ImportLeadsResult> {
  const csv = String(formData.get("csv") ?? "");
  const skipDuplicates = String(formData.get("skip_duplicates") ?? "true") === "true";

  if (!csv.trim()) {
    return { ok: false, inserted: 0, duplicates: 0, errors: [], error: "El fichero está vacío." };
  }

  const { rows, errors } = parseLeadsCsv(csv);

  let toInsert = rows;
  let duplicates = 0;
  if (skipDuplicates && rows.length > 0) {
    const existing = new Set(
      (await listLeadContacts()).map((l) => dedupeKey(l)).filter((k): k is string => !!k),
    );
    toInsert = rows.filter((r) => {
      const key = dedupeKey(r);
      if (key && existing.has(key)) {
        duplicates++;
        return false;
      }
      return true;
    });
  }

  if (toInsert.length === 0) {
    revalidatePath("/panel");
    return {
      ok: rows.length > 0,
      inserted: 0,
      duplicates,
      errors,
      error: rows.length === 0 ? "No hay ninguna fila válida que importar." : undefined,
    };
  }

  const res = await createLeadsBulk(toInsert);
  revalidatePath("/panel");
  if (!res.ok) {
    return {
      ok: false,
      inserted: res.inserted,
      duplicates,
      errors,
      error:
        res.error === "supabase_not_configured"
          ? "Supabase no está configurado."
          : "No se pudieron guardar todos los leads. Revisa cuántos entraron antes de reintentar.",
    };
  }
  return { ok: true, inserted: res.inserted, duplicates, errors };
}

export async function resendKitDigitalEmailAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Falta el id." };
  const lead = (await listLeads()).find((l) => l.id === id);
  if (!lead) return { ok: false, error: "Lead no encontrado." };
  if (lead.campaign !== "Kit Digital 2026") {
    return { ok: false, error: "Solo para leads de Kit Digital 2026." };
  }
  const email = (lead.email ?? "").trim();
  if (!email) return { ok: false, error: "El lead no tiene email." };

  const res = await sendKitDigital2026Email({ leadId: id, name: lead.name, email });
  revalidatePath("/panel");
  if (!res.ok) return { ok: false, error: "No se pudo reenviar. Inténtalo de nuevo." };
  return { ok: true };
}

export async function archiveLeadsAction(formData: FormData) {
  const ids = String(formData.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const archived = String(formData.get("archived") ?? "true") === "true";
  if (ids.length) {
    await archiveLeads(ids, archived);
    revalidatePath("/panel");
  }
}

export async function deleteLeadsAction(formData: FormData) {
  const ids = String(formData.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length) {
    await deleteLeads(ids);
    revalidatePath("/panel");
  }
}

export async function setLeadConsentAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const consent = String(formData.get("consent") ?? "") === "true";
  if (id) {
    await setLeadConsent(id, consent);
    revalidatePath("/panel");
  }
}

export async function bulkSetConsentAction(formData: FormData) {
  const ids = String(formData.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const consent = String(formData.get("consent") ?? "") === "true";
  if (ids.length) {
    await Promise.all(ids.map((id) => setLeadConsent(id, consent)));
    revalidatePath("/panel");
  }
}
