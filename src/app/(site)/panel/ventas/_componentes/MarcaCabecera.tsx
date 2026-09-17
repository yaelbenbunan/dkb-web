import Link from "next/link";
import type { Marca } from "@/lib/ventas/db";

const PESTANAS = [
  { clave: "resumen", texto: "Resumen", ruta: "" },
  { clave: "leads", texto: "Leads", ruta: "/leads" },
  { clave: "condiciones", texto: "Condiciones", ruta: "/condiciones" },
] as const;

export function MarcaCabecera({ marca, activa }: { marca: Marca; activa: (typeof PESTANAS)[number]["clave"] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <Link href="/panel/ventas" style={{ fontSize: 13, color: "#64748b", textDecoration: "none" }}>← Panel</Link>
        <h1 style={{ margin: 0, fontSize: 24 }}>{marca.nombre}</h1>
        {marca.estado !== "activa" && (
          <span style={{ fontSize: 12, fontWeight: 700, color: "#92400e", background: "#fef3c7", borderRadius: 6, padding: "2px 8px" }}>
            {marca.estado === "pausada" ? "Pausada" : "Finalizada"}
          </span>
        )}
      </div>
      <nav style={{ display: "flex", gap: 4, borderBottom: "1px solid #e2e8f0" }}>
        {PESTANAS.map((p) => (
          <Link
            key={p.clave}
            href={`/panel/ventas/${marca.slug}${p.ruta}`}
            style={{
              padding: "8px 14px",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
              color: p.clave === activa ? "#187bef" : "#64748b",
              borderBottom: `2px solid ${p.clave === activa ? "#187bef" : "transparent"}`,
              marginBottom: -1,
            }}
          >
            {p.texto}
          </Link>
        ))}
      </nav>
    </div>
  );
}
