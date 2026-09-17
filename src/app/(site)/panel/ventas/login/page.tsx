import { ventasLogin } from "./actions";

export const metadata = {
  title: "Ventas B2B — Acceso",
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

  const etiqueta = { display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 } as const;
  const campo = {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    fontSize: 15,
    marginBottom: 14,
    color: "#0f172a",
    boxSizing: "border-box",
  } as const;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        overflow: "auto",
        display: "grid",
        placeItems: "center",
        background: "#0b1220",
        fontFamily: "system-ui, sans-serif",
        padding: 24,
      }}
    >
      <form
        action={ventasLogin}
        style={{ width: "100%", maxWidth: 360, background: "#fff", borderRadius: 16, padding: 28 }}
      >
        <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: 2, color: "#187bef", textTransform: "uppercase" }}>
          dinkbit
        </div>
        <h1 style={{ margin: "10px 0 18px", fontSize: 22, color: "#0f172a" }}>Ventas B2B</h1>
        {error && <p style={{ margin: "0 0 14px", color: "#dc2626", fontSize: 14 }}>{error}</p>}
        <input type="hidden" name="next" value={sp.next ?? "/panel/ventas"} />
        <label style={etiqueta} htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required style={campo} />
        <label style={etiqueta} htmlFor="password">Contraseña</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required style={campo} />
        <button
          type="submit"
          style={{ width: "100%", background: "#187bef", color: "#fff", border: "none", borderRadius: 8, padding: "11px 0", fontSize: 15, fontWeight: 700, cursor: "pointer" }}
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
