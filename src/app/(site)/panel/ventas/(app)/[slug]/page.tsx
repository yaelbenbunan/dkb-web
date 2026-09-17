import Link from "next/link";
import { requireUsuaria } from "@/lib/ventas/auth";
import { FASES, FASE_LABELS } from "@/lib/ventas/dominio";
import { hoyMadrid } from "@/lib/ventas/metricas";
import { cargarPanelMarca, mesDeConsulta } from "@/lib/ventas/paneles";
import { cargarMarca } from "../../_componentes/cargarMarca";
import { EmbudoVista } from "../../_componentes/EmbudoVista";
import { FaseEtiqueta } from "../../_componentes/FaseEtiqueta";
import { MarcaCabecera } from "../../_componentes/MarcaCabecera";
import { SelectorMes } from "../../_componentes/SelectorMes";
import { tarjeta, titulo } from "../../_componentes/estilos";

export default async function MarcaResumenPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ mes?: string }>;
}) {
  await requireUsuaria();
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const marca = await cargarMarca(slug);
  const mes = mesDeConsulta(sp.mes);
  const { embudo, resumen } = await cargarPanelMarca(marca, mes, hoyMadrid());

  const filas: [string, number][] = [
    ["Leads nuevos", resumen.leadsNuevos],
    ["Llamadas hechas", resumen.llamadas],
    ["Pasaron a interesado", resumen.interesados],
    ["Envíos de muestras", resumen.muestras],
    ["Seguimientos atrasados (ahora)", resumen.seguimientosAtrasados],
  ];

  return (
    <div>
      <MarcaCabecera marca={marca} activa="resumen" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        <section style={tarjeta}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            <h2 style={{ ...titulo, margin: 0 }}>Actividad del mes</h2>
            <SelectorMes mes={mes} ruta={`/panel/ventas/${slug}`} />
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <tbody>
              {filas.map(([texto, valor]) => (
                <tr key={texto}>
                  <td style={{ padding: "6px 0", color: "#475569" }}>{texto}</td>
                  <td style={{ padding: "6px 0", textAlign: "right", fontWeight: 700 }}>{valor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section style={tarjeta}>
          <h2 style={titulo}>Embudo acumulado</h2>
          <EmbudoVista embudo={embudo} />
          <p style={{ margin: "10px 0 0", fontSize: 12, color: "#64748b" }}>
            Cuenta cada lead en todas las etapas a las que llegó alguna vez. El % es el paso desde la etapa anterior.
          </p>
        </section>

        <section style={tarjeta}>
          <h2 style={titulo}>Leads por fase (ahora)</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {FASES.map((f) => (
              <Link key={f} href={`/panel/ventas/${slug}/leads?fase=${f}`} style={{ display: "flex", justifyContent: "space-between", textDecoration: "none", color: "#0f172a" }}>
                <FaseEtiqueta fase={f} />
                <strong aria-label={FASE_LABELS[f]}>{embudo.porFase[f]}</strong>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
