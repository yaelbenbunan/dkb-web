import Link from "next/link";
import { requireUsuaria } from "@/lib/ventas/auth";
import { listMarcas } from "@/lib/ventas/db";
import { tarjeta } from "../_componentes/estilos";
import { NuevaMarcaForm } from "./NuevaMarcaForm";

export default async function PanelVentasPage({ searchParams }: { searchParams: Promise<{ aviso?: string }> }) {
  const usuaria = await requireUsuaria();
  const [marcas, sp] = await Promise.all([listMarcas(), searchParams]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {sp.aviso === "permiso" && (
        <p style={{ margin: 0, color: "#b45309", fontWeight: 600 }}>Esa sección es solo para admin.</p>
      )}
      <h1 style={{ margin: 0, fontSize: 24 }}>Marcas</h1>
      {marcas.length === 0 && <p style={{ color: "#64748b" }}>Todavía no hay ninguna marca.</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
        {marcas.map((m) => (
          <Link key={m.id} href={`/panel/ventas/${m.slug}`} style={{ ...tarjeta, textDecoration: "none", color: "#0f172a" }}>
            <strong style={{ fontSize: 17 }}>{m.nombre}</strong>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{m.estado}</div>
          </Link>
        ))}
      </div>
      {usuaria.rol === "admin" && <NuevaMarcaForm />}
    </div>
  );
}
