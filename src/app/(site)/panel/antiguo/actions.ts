"use server";

// Solo el acceso al /panel viejo. Las escrituras de leads se retiraron con la
// unificación del CRM (2026-10-15): los leads se trabajan en /panel.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  checkCredentials,
  createSessionToken,
  PANEL_COOKIE,
} from "@/lib/panel-auth";

export async function panelLogin(formData: FormData) {
  const user = String(formData.get("user") ?? "");
  const pass = String(formData.get("password") ?? "");
  const nextRaw = String(formData.get("next") ?? "/panel/antiguo");
  const next = nextRaw.startsWith("/panel/antiguo") ? nextRaw : "/panel/antiguo";

  if (!checkCredentials(user, pass)) {
    redirect(`/panel/antiguo/login?error=1&next=${encodeURIComponent(next)}`);
  }
  const token = await createSessionToken();
  if (!token) redirect(`/panel/antiguo/login?error=2&next=${encodeURIComponent(next)}`);

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
  redirect("/panel/antiguo/login");
}
