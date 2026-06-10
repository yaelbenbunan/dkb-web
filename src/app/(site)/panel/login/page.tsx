import { panelLogin } from "../actions";

export const metadata = {
  title: "Panel — Acceso",
  robots: { index: false, follow: false },
};

export default async function PanelLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const sp = await searchParams;
  const error = sp.error;
  const next = sp.next ?? "/panel";

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
        action={panelLogin}
        style={{
          width: "100%",
          maxWidth: 360,
          background: "#fff",
          borderRadius: 16,
          padding: 28,
          boxShadow: "0 20px 50px -20px rgba(0,0,0,.5)",
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: 2, color: "#187bef", textTransform: "uppercase" }}>
          dinkbit
        </div>
        <h1 style={{ margin: "10px 0 18px", fontSize: 22, color: "#0f172a" }}>
          Panel de leads
        </h1>
        {error && (
          <p style={{ margin: "0 0 14px", color: "#dc2626", fontSize: 14 }}>
            {error === "1" ? "Usuario o contraseña incorrectos." : "No se pudo iniciar sesión (config)."}
          </p>
        )}
        <input type="hidden" name="next" value={next} />
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569" }}>
          Usuario
        </label>
        <input
          name="user"
          autoComplete="username"
          required
          style={inputStyle}
        />
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginTop: 12 }}>
          Contraseña
        </label>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          style={inputStyle}
        />
        <button
          type="submit"
          style={{
            marginTop: 18,
            width: "100%",
            height: 44,
            border: 0,
            borderRadius: 10,
            background: "#187bef",
            color: "#fff",
            fontWeight: 700,
            fontSize: 15,
            cursor: "pointer",
          }}
        >
          Entrar
        </button>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  marginTop: 6,
  width: "100%",
  height: 42,
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  padding: "0 12px",
  fontSize: 15,
  boxSizing: "border-box",
  // Explicit colours: the site runs in dark theme, which would otherwise make
  // the typed text white on the white field.
  background: "#ffffff",
  color: "#0f172a",
};
