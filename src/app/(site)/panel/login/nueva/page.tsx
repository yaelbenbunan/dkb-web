import { redirect } from "next/navigation";
import { crearClienteSesion } from "@/lib/ventas/auth";
import { guardarContrasenaNueva } from "../recuperar/acciones";
import { botonAcceso, campoAcceso, etiquetaAcceso, TarjetaAcceso } from "../TarjetaAcceso";

export const metadata = {
  title: "Panel — Contraseña nueva",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const ERRORES: Record<string, string> = {
  distintas: "Las dos contraseñas no coinciden.",
  corta: "La contraseña necesita al menos 10 caracteres.",
  guardar: "No se pudo guardar. Prueba con otra contraseña o pide un enlace nuevo.",
};

/** Solo con la sesión que abre el enlace del correo (o una sesión normal). */
export default async function NuevaContrasenaPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await crearClienteSesion();
  if (!supabase) redirect("/panel/login?error=config");
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/panel/login/recuperar?error=enlace");

  const sp = await searchParams;
  const error = sp.error ? (ERRORES[sp.error] ?? "No se pudo guardar.") : null;

  return (
    <TarjetaAcceso titulo="Contraseña nueva">
      <form action={guardarContrasenaNueva}>
        <p style={{ margin: "0 0 14px", fontSize: 14, color: "#475569" }}>Para {data.user.email}. Mínimo 10 caracteres.</p>
        {error && <p role="alert" style={{ margin: "0 0 14px", color: "#dc2626", fontSize: 14 }}>{error}</p>}
        {/* Para que el gestor de contraseñas la guarde con el email correcto. */}
        <input type="hidden" name="email" autoComplete="username" value={data.user.email ?? ""} />
        <label style={etiquetaAcceso} htmlFor="password">Contraseña nueva</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required style={campoAcceso} />
        <label style={etiquetaAcceso} htmlFor="repetida">Repítela</label>
        <input id="repetida" name="repetida" type="password" autoComplete="new-password" minLength={10} required style={campoAcceso} />
        <button type="submit" style={botonAcceso}>Guardar y entrar</button>
      </form>
    </TarjetaAcceso>
  );
}
