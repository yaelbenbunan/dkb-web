import Link from "next/link";
import { botonAcceso, campoAcceso, enlaceAcceso, etiquetaAcceso, TarjetaAcceso } from "../TarjetaAcceso";
import { pedirRecuperacion } from "./acciones";

export const metadata = {
  title: "Panel — Recuperar la contraseña",
  robots: { index: false, follow: false },
};

const ERRORES: Record<string, string> = {
  email: "Escribe un email válido.",
  enlace: "El enlace ha caducado o ya se usó. Pide otro.",
};

export default async function RecuperarPage({ searchParams }: { searchParams: Promise<{ enviado?: string; error?: string }> }) {
  const sp = await searchParams;
  const error = sp.error ? (ERRORES[sp.error] ?? "No se pudo completar. Inténtalo de nuevo.") : null;

  return (
    <TarjetaAcceso titulo="Recuperar la contraseña">
      {sp.enviado ? (
        <p role="status" style={{ margin: "0 0 16px", fontSize: 14, color: "#0f172a", lineHeight: 1.5 }}>
          Si ese email tiene acceso al panel, te hemos enviado un enlace para poner una contraseña nueva. Ábrelo en este mismo navegador. Si no llega en unos minutos, mira en spam.
        </p>
      ) : (
        <form action={pedirRecuperacion}>
          <p style={{ margin: "0 0 14px", fontSize: 14, color: "#475569", lineHeight: 1.5 }}>
            Escribe el email con el que entras y te mandamos un enlace para poner una contraseña nueva.
          </p>
          {error && <p style={{ margin: "0 0 14px", color: "#dc2626", fontSize: 14 }}>{error}</p>}
          <label style={etiquetaAcceso} htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="username" required style={campoAcceso} />
          <button type="submit" style={botonAcceso}>Enviar el enlace</button>
        </form>
      )}
      <p style={{ margin: "16px 0 0", textAlign: "center" }}>
        <Link href="/panel/login" style={enlaceAcceso}>Volver al acceso</Link>
      </p>
    </TarjetaAcceso>
  );
}
