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
  LEAD_STATUSES,
  type LeadStatus,
} from "@/lib/imagina-leads";

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
