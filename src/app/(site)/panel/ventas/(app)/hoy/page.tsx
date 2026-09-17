import Link from "next/link";
import { requireUsuaria } from "@/lib/ventas/auth";
import { listSeguimientosUsuaria, type LeadConMarca } from "@/lib/ventas/db";
import { TIPO_NEGOCIO_LABELS } from "@/lib/ventas/dominio";
import { agruparSeguimientos, formatoFecha, hoyMadrid } from "@/lib/ventas/metricas";
import { FaseEtiqueta } from "../../_componentes/FaseEtiqueta";
import { tarjeta, td, th, titulo } from "../../_componentes/estilos";

function Tabla({ leads, mostrarFecha }: { leads: LeadConMarca[]; mostrarFecha: boolean }) {
  if (leads.length === 0) return <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>Nada pendiente.</p>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 720 }}>
        <thead>
          <tr>
            <th style={th}>Negocio</th>
            <th style={th}>Marca</th>
            <th style={th}>Tipo</th>
            <th style={th}>Fase</th>
            <th style={th}>Teléfono</th>
            {mostrarFecha && <th style={th}>Tocaba</th>}
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => (
            <tr key={l.id}>
              <td style={td}>
                <Link href={`/panel/ventas/${l.marca?.slug}/leads/${l.id}`} style={{ color: "#187bef", fontWeight: 600, textDecoration: "none" }}>
                  {l.negocio}
                </Link>
              </td>
              <td style={td}>{l.marca?.nombre ?? "—"}</td>
              <td style={td}>{l.tipo_negocio ? TIPO_NEGOCIO_LABELS[l.tipo_negocio] : "—"}</td>
              <td style={td}><FaseEtiqueta fase={l.fase} /></td>
              <td style={td}>{l.telefono ? <a href={`tel:${l.telefono}`} style={{ color: "#0f172a" }}>{l.telefono}</a> : "—"}</td>
              {mostrarFecha && <td style={{ ...td, color: "#b91c1c", fontWeight: 600 }}>{l.proximo_seguimiento ? formatoFecha(l.proximo_seguimiento) : "—"}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function MiDiaPage() {
  const usuaria = await requireUsuaria();
  const hoy = hoyMadrid();
  const grupos = agruparSeguimientos(await listSeguimientosUsuaria(usuaria.id, hoy), hoy);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h1 style={{ margin: 0, fontSize: 24 }}>Mi día · {formatoFecha(hoy)}</h1>
      <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
        Leads asignados a ti con seguimiento para hoy o atrasado. Al registrar la llamada, pon la fecha del siguiente paso para que vuelva a salir aquí.
      </p>
      <section style={tarjeta}>
        <h2 style={titulo}>Atrasados ({grupos.atrasados.length})</h2>
        <Tabla leads={grupos.atrasados} mostrarFecha />
      </section>
      <section style={tarjeta}>
        <h2 style={titulo}>Para hoy ({grupos.hoy.length})</h2>
        <Tabla leads={grupos.hoy} mostrarFecha={false} />
      </section>
    </div>
  );
}
