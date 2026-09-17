import Link from "next/link";
import type { Usuaria } from "@/lib/ventas/db";
import { ROL_LABELS } from "@/lib/ventas/dominio";
import { ventasLogout } from "../login/actions";

export function VentasShell({ usuaria, children }: { usuaria: Usuaria; children: React.ReactNode }) {
  const enlace = { color: "#cbd5e1", textDecoration: "none", fontSize: 14 } as const;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        overflow: "auto",
        background: "#f1f5f9",
        color: "#0f172a",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          padding: "12px 22px",
          background: "#0b1220",
          color: "#fff",
        }}
      >
        <nav style={{ display: "flex", alignItems: "baseline", gap: 18, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 800, letterSpacing: 2, color: "#187bef", textTransform: "uppercase", fontSize: 12 }}>dinkbit</span>
          <strong style={{ fontSize: 16 }}>Ventas B2B</strong>
          <Link href="/panel/ventas" style={enlace}>Panel</Link>
          <Link href="/panel/ventas/hoy" style={enlace}>Mi día</Link>
          {usuaria.rol === "admin" && <Link href="/panel/ventas/usuarias" style={enlace}>Usuarias</Link>}
        </nav>
        <form action={ventasLogout} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, color: "#cbd5e1" }}>
            {usuaria.nombre} · {ROL_LABELS[usuaria.rol]}
          </span>
          <button type="submit" style={{ background: "none", border: "1px solid #334155", color: "#e2e8f0", borderRadius: 6, padding: "5px 10px", fontSize: 13, cursor: "pointer" }}>
            Salir
          </button>
        </form>
      </header>
      <main style={{ padding: 22, maxWidth: 1240, margin: "0 auto" }}>{children}</main>
    </div>
  );
}
