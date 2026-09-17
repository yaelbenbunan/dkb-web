import Link from "next/link";
import { requireUsuaria } from "@/lib/ventas/auth";
import { listMarcas } from "@/lib/ventas/db";
import { hoyMadrid } from "@/lib/ventas/metricas";
import { cargarPanelMarca, mesDeConsulta } from "@/lib/ventas/paneles";
import { EmbudoVista } from "../_componentes/EmbudoVista";
import { SelectorMes } from "../_componentes/SelectorMes";
import { tarjeta } from "../_componentes/estilos";
import { NuevaMarcaForm } from "./NuevaMarcaForm";

function Cifra({ texto, valor, alerta = false }: { texto: string; valor: number; alerta?: boolean }) {
  return (
    <div style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 10px" }}>
      <div style={{ fontSize: 12, color: "#64748b" }}>{texto}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: alerta && valor > 0 ? "#b91c1c" : "#0f172a" }}>{valor}</div>
    </div>
  );
}

export default async function PanelVentasPage({ searchParams }: { searchParams: Promise<{ aviso?: string; mes?: string }> }) {
  const usuaria = await requireUsuaria();
  const sp = await searchParams;
  const mes = mesDeConsulta(sp.mes);
  const hoy = hoyMadrid();
  const marcas = (await listMarcas()).filter((m) => m.estado !== "finalizada");
  const paneles = await Promise.all(marcas.map((m) => cargarPanelMarca(m, mes, hoy)));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {sp.aviso === "permiso" && <p style={{ margin: 0, color: "#b45309", fontWeight: 600 }}>Esa sección es solo para admin.</p>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>Marcas</h1>
        <SelectorMes mes={mes} ruta="/panel/ventas" />
      </div>
      {paneles.length === 0 && <p style={{ color: "#64748b" }}>Todavía no hay ninguna marca activa.</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 16 }}>
        {paneles.map(({ marca, embudo, resumen }) => (
          <section key={marca.id} style={{ ...tarjeta, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <Link href={`/panel/ventas/${marca.slug}?mes=${mes}`} style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", textDecoration: "none" }}>
                {marca.nombre}
              </Link>
              {marca.estado === "pausada" && <span style={{ fontSize: 12, color: "#92400e" }}>Pausada</span>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              <Cifra texto="Leads nuevos" valor={resumen.leadsNuevos} />
              <Cifra texto="Llamadas" valor={resumen.llamadas} />
              <Cifra texto="Interesados" valor={resumen.interesados} />
              <Cifra texto="Muestras" valor={resumen.muestras} />
              <Cifra texto="Seguim. atrasados" valor={resumen.seguimientosAtrasados} alerta />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>Embudo acumulado</div>
              <EmbudoVista embudo={embudo} />
            </div>
          </section>
        ))}
      </div>
      {usuaria.rol === "admin" && <NuevaMarcaForm />}
    </div>
  );
}
