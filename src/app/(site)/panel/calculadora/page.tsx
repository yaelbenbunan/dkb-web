import Link from "next/link";
import { getServiceCatalog, CATALOG_SNAPSHOT_DATE } from "@/lib/service-catalog";
import { Calculadora } from "./Calculadora";
import { panelLogout } from "../actions";

export const metadata = {
  title: "Calculadora — dinkbit",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function CalculadoraPage() {
  const { catalogo, live } = await getServiceCatalog();
  const totalServicios = Object.values(catalogo).reduce((a, l) => a + l.length, 0);

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
          gap: 12,
          padding: "14px 22px",
          background: "#0b1220",
          color: "#fff",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span style={{ fontWeight: 800, letterSpacing: 2, color: "#187bef", textTransform: "uppercase", fontSize: 12 }}>
            dinkbit
          </span>
          <strong style={{ fontSize: 16 }}>🧮 Calculadora</strong>
          <Link href="/panel" style={{ fontSize: 13, color: "#cbd5e1", textDecoration: "none" }}>
            ← Leads
          </Link>
        </div>
        <form action={panelLogout} style={{ margin: 0 }}>
          <button
            type="submit"
            style={{ border: "1px solid #334155", background: "transparent", color: "#cbd5e1", borderRadius: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer" }}
          >
            Salir
          </button>
        </form>
      </header>

      <div style={{ padding: 22, maxWidth: 1100, margin: "0 auto" }}>
        <p style={{ fontSize: 14, color: "#475569", marginTop: 0, marginBottom: 18 }}>
          Arma un presupuesto en directo: elige los servicios y los meses a
          proyectar. El total se calcula al instante.{" "}
          <span style={{ color: "#94a3b8" }}>
            {totalServicios} servicios ·{" "}
            {live ? "catálogo en vivo" : `catálogo del ${CATALOG_SNAPSHOT_DATE}`}
          </span>
        </p>
        <Calculadora catalogo={catalogo} />
      </div>
    </div>
  );
}
