import Link from "next/link";
import { requireUsuaria } from "@/lib/ventas/auth";
import { listSecuencias, type SecuenciaRow } from "@/lib/ventas/db";
import { formatoFechaHora } from "@/lib/ventas/metricas";
import { parsearSecuencia } from "@/lib/ventas/secuencias";
import { cargarMarca } from "../../../_componentes/cargarMarca";
import { MarcaCabecera } from "../../../_componentes/MarcaCabecera";
import { tarjeta, td, th } from "../../../_componentes/estilos";
import { AccionesSecuencia } from "./AccionesSecuencia";
import { NuevaSecuenciaForm } from "./NuevaSecuenciaForm";

const ESTADO_LABELS: Record<SecuenciaRow["estado"], string> = {
  borrador: "Borrador",
  activa: "Activa",
  archivada: "Archivada",
};

const ESTADO_COLORES: Record<SecuenciaRow["estado"], { bg: string; text: string }> = {
  borrador: { bg: "#e2e8f0", text: "#334155" },
  activa: { bg: "#dcfce7", text: "#166534" },
  archivada: { bg: "#f1f5f9", text: "#64748b" },
};

function EstadoEtiqueta({ estado }: { estado: SecuenciaRow["estado"] }) {
  const c = ESTADO_COLORES[estado];
  return (
    <span style={{ display: "inline-block", background: c.bg, color: c.text, borderRadius: 6, padding: "3px 8px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
      {ESTADO_LABELS[estado]}
    </span>
  );
}

export default async function SecuenciasPage({ params }: { params: Promise<{ slug: string }> }) {
  const usuaria = await requireUsuaria();
  const { slug } = await params;
  const marca = await cargarMarca(slug);
  const admin = usuaria.rol === "admin";
  const filas = await listSecuencias(marca.id);

  return (
    <div>
      <MarcaCabecera marca={marca} activa="secuencias" />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <p style={{ margin: 0, fontSize: 13, color: "#1e40af", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "8px 12px" }}>
          Todavía no se envía nada: esto sirve para escribir y probar la conversación.
        </p>

        <section style={{ ...tarjeta, padding: 0, overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 640 }}>
            <thead>
              <tr>
                <th style={th}>Nombre</th>
                <th style={th}>Estado</th>
                <th style={th}>Pasos</th>
                <th style={th}>Última edición</th>
                {admin && <th style={th}>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {filas.length === 0 && (
                <tr>
                  <td style={{ ...td, color: "#64748b" }} colSpan={admin ? 5 : 4}>Todavía no hay secuencias.</td>
                </tr>
              )}
              {filas.map((f) => {
                const parseado = parsearSecuencia(f.pasos);
                const nPasos = parseado.ok ? Object.keys(parseado.secuencia.pasos).length : null;
                return (
                  <tr key={f.id}>
                    <td style={td}>
                      <Link href={`/panel/ventas/${slug}/secuencias/${f.id}`} style={{ color: "#187bef", fontWeight: 600, textDecoration: "none" }}>
                        {f.nombre}
                      </Link>
                    </td>
                    <td style={td}><EstadoEtiqueta estado={f.estado} /></td>
                    <td style={td}>
                      {nPasos !== null ? nPasos : <span style={{ color: "#b91c1c", fontWeight: 600 }}>Error en los datos guardados</span>}
                    </td>
                    <td style={td}>{formatoFechaHora(f.updated_at)}</td>
                    {admin && (
                      <td style={td}>
                        <AccionesSecuencia slug={slug} secuencia={{ id: f.id, estado: f.estado }} />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {admin && <NuevaSecuenciaForm slug={slug} />}
      </div>
    </div>
  );
}
