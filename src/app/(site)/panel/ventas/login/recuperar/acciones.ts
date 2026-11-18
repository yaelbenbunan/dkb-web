"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { crearClienteSesion } from "@/lib/ventas/auth";
import { getUsuaria } from "@/lib/ventas/db";
import { emailDeRecuperacion, origenDeVuelta, RUTA_NUEVA, RUTA_VUELTA } from "@/lib/ventas/recuperar";
import { leerPassword } from "@/lib/ventas/validacion";

/**
 * Pide a Supabase el correo de recuperación. Responde siempre lo mismo, exista
 * o no la cuenta: si no, el formulario serviría para averiguar qué emails
 * tienen acceso al panel.
 */
export async function pedirRecuperacion(formData: FormData): Promise<void> {
  const email = emailDeRecuperacion(formData.get("email"));
  if (!email) redirect("/panel/ventas/login/recuperar?error=email");

  const supabase = await crearClienteSesion();
  if (!supabase) redirect("/panel/ventas/login?error=config");

  const h = await headers();
  const origen = origenDeVuelta(h.get("x-forwarded-host") ?? h.get("host"), h.get("x-forwarded-proto"));
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origen}${RUTA_VUELTA}` });
  // Se registra para nosotras (límite de envíos, SMTP…), pero no se le dice a quien lo pide.
  if (error) console.error("[recuperar] resetPasswordForEmail:", error.message);
  redirect("/panel/ventas/login/recuperar?enviado=1");
}

/** Guarda la contraseña nueva de quien entró con el enlace del correo. */
export async function guardarContrasenaNueva(formData: FormData): Promise<void> {
  const password = String(formData.get("password") ?? "");
  const repetida = String(formData.get("repetida") ?? "");
  if (password !== repetida) redirect(`${RUTA_NUEVA}?error=distintas`);
  const leida = leerPassword(password);
  if (!leida.ok) redirect(`${RUTA_NUEVA}?error=corta`);

  const supabase = await crearClienteSesion();
  if (!supabase) redirect("/panel/ventas/login?error=config");
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/panel/ventas/login/recuperar?error=enlace");

  const { error } = await supabase.auth.updateUser({ password: leida.datos });
  if (error) {
    console.error("[recuperar] updateUser:", error.message);
    redirect(`${RUTA_NUEVA}?error=guardar`);
  }

  // Una cuenta sin perfil activo cambia su contraseña pero no entra al panel.
  const usuaria = await getUsuaria(data.user.id);
  if (!usuaria?.activa) {
    await supabase.auth.signOut();
    redirect("/panel/ventas/login?error=inactiva");
  }
  redirect("/panel/ventas");
}
