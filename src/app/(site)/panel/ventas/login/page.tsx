import Link from "next/link";
import { ventasLogin } from "./actions";
import { botonAcceso, campoAcceso, enlaceAcceso, etiquetaAcceso, TarjetaAcceso } from "./TarjetaAcceso";

export const metadata = {
  title: "Panel — Acceso",
  robots: { index: false, follow: false },
};

const ERRORES: Record<string, string> = {
  credenciales: "Email o contraseña incorrectos.",
  inactiva: "Tu cuenta está desactivada. Habla con Yael.",
  config: "El acceso no está configurado en el servidor (falta SUPABASE_PUBLISHABLE_KEY).",
};

export default async function VentasLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const sp = await searchParams;
  const error = sp.error ? (ERRORES[sp.error] ?? "No se pudo iniciar sesión.") : null;

  return (
    <TarjetaAcceso titulo="Panel">
      <form action={ventasLogin}>
        {error && <p style={{ margin: "0 0 14px", color: "#dc2626", fontSize: 14 }}>{error}</p>}
        <input type="hidden" name="next" value={sp.next ?? "/panel/ventas"} />
        <label style={etiquetaAcceso} htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required style={campoAcceso} />
        <label style={etiquetaAcceso} htmlFor="password">Contraseña</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required style={campoAcceso} />
        <button type="submit" style={botonAcceso}>Entrar</button>
      </form>
      <p style={{ margin: "16px 0 0", textAlign: "center" }}>
        <Link href="/panel/ventas/login/recuperar" style={enlaceAcceso}>¿Has olvidado tu contraseña?</Link>
      </p>
    </TarjetaAcceso>
  );
}
