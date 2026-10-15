// Cambia el email de una usuaria del módulo de ventas (/panel/ventas): el del
// login (Supabase Auth) y el del perfil. Conserva su id, así que no pierde rol,
// leads asignados ni historial. Opcionalmente cambia el rol.
// Uso: node --env-file=.env.local scripts/ventas-cambiar-email.mjs tech@dinkbit.com yael.benbunan@dinkbit.com [admin|comercial]
import { createClient } from "@supabase/supabase-js";

const [deRaw, aRaw, rol] = process.argv.slice(2);
if (!deRaw || !aRaw || (rol && !["admin", "comercial"].includes(rol))) {
  console.error("Uso: node --env-file=.env.local scripts/ventas-cambiar-email.mjs actual@dinkbit.com nuevo@dinkbit.com [admin|comercial]");
  process.exit(1);
}
const de = deRaw.trim().toLowerCase();
const a = aRaw.trim().toLowerCase();
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: perfil, error: errPerfil } = await sb.from("ventas_usuarias").select("id, nombre, rol").eq("email", de).maybeSingle();
if (errPerfil || !perfil) {
  console.error(`No hay ninguna usuaria de ventas con el email ${de}.`, errPerfil?.message ?? "");
  process.exit(1);
}

// La API de administración actualiza también la identidad de login; tocar
// auth.users a mano por SQL la dejaría desincronizada.
const { error: errAuth } = await sb.auth.admin.updateUserById(perfil.id, { email: a, email_confirm: true });
if (errAuth) {
  console.error("No se pudo cambiar el email del login:", errAuth.message);
  process.exit(1);
}
const { error: errUpd } = await sb
  .from("ventas_usuarias")
  .update({ email: a, ...(rol ? { rol } : {}) })
  .eq("id", perfil.id);
if (errUpd) {
  // Se deshace el cambio del login para no dejar las dos cosas distintas.
  await sb.auth.admin.updateUserById(perfil.id, { email: de, email_confirm: true });
  console.error("No se pudo actualizar el perfil (login restaurado):", errUpd.message);
  process.exit(1);
}
console.log(`${perfil.nombre}: ${de} → ${a}, rol ${rol ?? perfil.rol}. La contraseña no cambia.`);
