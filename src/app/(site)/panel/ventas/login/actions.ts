"use server";

import { redirect } from "next/navigation";
import { crearClienteSesion } from "@/lib/ventas/auth";
import { getUsuaria } from "@/lib/ventas/db";
import { destinoTrasLogin } from "@/lib/ventas/rutas";

export async function ventasLogin(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const destino = destinoTrasLogin(formData.get("next"));
  const volver = (error: string): never =>
    redirect(`/panel/ventas/login?error=${error}&next=${encodeURIComponent(destino)}`);

  const supabase = await crearClienteSesion();
  if (!supabase) return volver("config");

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return volver("credenciales");

  const usuaria = await getUsuaria(data.user.id);
  if (!usuaria?.activa) {
    await supabase.auth.signOut();
    return volver("inactiva");
  }
  redirect(destino);
}

export async function ventasLogout(): Promise<void> {
  const supabase = await crearClienteSesion();
  await supabase?.auth.signOut();
  redirect("/panel/ventas/login");
}
