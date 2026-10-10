import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUsuaria } from "@/lib/ventas/auth";
import { getMarcaPorId, listSeguimientosUsuaria, listTareasUsuaria, type LeadConMarca } from "@/lib/ventas/db";
import { TIPO_NEGOCIO_LABELS } from "@/lib/ventas/dominio";
import { ahoraMadrid, formatoFecha, formatoSeguimiento } from "@/lib/ventas/metricas";
import { estadoSeguimiento, vencimiento } from "@/lib/ventas/tablero";
import { FaseEtiqueta } from "../../_componentes/FaseEtiqueta";
import { tarjeta, td, th, titulo } from "../../_componentes/estilos";

function Tabla({ leads, atrasados }: { leads: LeadConMarca[]; atrasados: boolean }) {
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
            <th style={th}>Cuándo</th>
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
              <td style={atrasados ? { ...td, color: "#b91c1c", fontWeight: 600 } : td}>{l.proximo_seguimiento ? formatoSeguimiento(l.proximo_seguimiento, l.proximo_seguimiento_hora ?? null) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function MiDiaPage() {
  const usuaria = await requireUsuaria();
  if (usuaria.rol === "cliente") {
    const marca = usuaria.marca_id ? await getMarcaPorId(usuaria.marca_id) : null;
    redirect(marca ? `/panel/ventas/${marca.slug}` : "/panel/ventas/login?aviso=sin-marca");
  }
  const ahora = ahoraMadrid();
  const [seguimientos, tareas] = await Promise.all([listSeguimientosUsuaria(usuaria.id, ahora.fecha), listTareasUsuaria(usuaria.id)]);
  // El estado mira la hora: un seguimiento de hoy a las 10:00 ya es atrasado a las 11:00.
  const atrasados = seguimientos.filter((l) => estadoSeguimiento(l.proximo_seguimiento, l.proximo_seguimiento_hora ?? null, l.fase, ahora) === "atrasado");
  const deHoy = seguimientos.filter((l) => estadoSeguimiento(l.proximo_seguimiento, l.proximo_seguimiento_hora ?? null, l.fase, ahora) === "hoy");
  const misTareas = tareas
    .map((t) => ({ t, estado: vencimiento(t.vence, t.vence_hora, ahora) }))
    .filter((x) => x.estado === "atrasado" || x.estado === "hoy");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h1 style={{ margin: 0, fontSize: 24 }}>Mi día · {formatoFecha(ahora.fecha)}</h1>
      <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
        Leads asignados a ti con seguimiento para hoy o atrasado. Al registrar la llamada, pon la fecha del siguiente paso para que vuelva a salir aquí.
      </p>
      <section style={tarjeta}>
        <h2 style={titulo}>Atrasados ({atrasados.length})</h2>
        <Tabla leads={atrasados} atrasados />
      </section>
      <section style={tarjeta}>
        <h2 style={titulo}>Para hoy ({deHoy.length})</h2>
        <Tabla leads={deHoy} atrasados={false} />
      </section>
      <section style={tarjeta}>
        <h2 style={titulo}>Mis tareas ({misTareas.length})</h2>
        {misTareas.length === 0 ? (
          <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>Nada pendiente.</p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            {misTareas.map(({ t, estado }) => (
              <li key={t.id}>
                <Link
                  href={`/panel/ventas/${t.marca?.slug}/tareas?de=yo`}
                  style={{ display: "flex", gap: 10, flexWrap: "wrap", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 8, textDecoration: "none", fontSize: 14, color: "#0f172a" }}
                >
                  <strong style={{ flex: "1 1 220px" }}>{t.titulo}</strong>
                  <span style={{ color: "#64748b" }}>{t.marca?.nombre ?? "—"}</span>
                  <span style={{ fontWeight: estado === "atrasado" ? 700 : 400, color: estado === "atrasado" ? "#b91c1c" : "#334155" }}>
                    {t.vence ? formatoSeguimiento(t.vence, t.vence_hora) : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
