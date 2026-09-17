// Crea una usuaria admin del módulo de ventas (/panel/ventas).
// Uso: node --env-file=.env.local scripts/ventas-crear-admin.mjs "Yael" tech@dinkbit.com
// Imprime una contraseña temporal: cámbiala en el panel (Usuarias → Nueva contraseña).
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const [nombre, emailRaw] = process.argv.slice(2);
if (!nombre || !emailRaw) {
  console.error('Uso: node --env-file=.env.local scripts/ventas-crear-admin.mjs "Nombre" email@dinkbit.com');
  process.exit(1);
}
const email = emailRaw.trim().toLowerCase();
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const password = randomBytes(12).toString("base64url");
const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true });
if (error || !data.user) {
  console.error("No se pudo crear el usuario:", error?.message);
  process.exit(1);
}
const { error: perfilError } = await sb
  .from("ventas_usuarias")
  .insert({ id: data.user.id, nombre, email, rol: "admin" });
if (perfilError) {
  await sb.auth.admin.deleteUser(data.user.id);
  console.error("No se pudo crear el perfil:", perfilError.message);
  process.exit(1);
}
console.log(`Admin creada: ${email}\nContraseña temporal: ${password}`);
