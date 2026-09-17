import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUsuaria } from "@/lib/ventas/auth";
import { getLead, listActividadLead, listUsuarias } from "@/lib/ventas/db";
import { ORIGEN_LABELS } from "@/lib/ventas/dominio";
import { describirActividad } from "@/lib/ventas/historial";
import { formatoFecha, formatoFechaHora } from "@/lib/ventas/metricas";
import { cargarMarca } from "../../../../_componentes/cargarMarca";
import { FaseEtiqueta } from "../../../../_componentes/FaseEtiqueta";
import { MarcaCabecera } from "../../../../_componentes/MarcaCabecera";
import { tarjeta, titulo } from "../../../../_componentes/estilos";
import { AccionesLead } from "./AccionesLead";
import { Asignacion } from "./Asignacion";
import { DatosLead } from "./DatosLead";

export default async function FichaLeadPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  await requireUsuaria();
  const { slug, id } = await params;
  const marca = await cargarMarca(slug);
  const lead = await getLead(id);
  if (!lead || lead.marca_id !== marca.id) notFound();

  const [actividad, usuarias] = await Promise.all([listActividadLead(lead.id), listUsuarias()]);
  const nombres = Object.fromEntries(usuarias.map((u) => [u.id, u.nombre]));
  const activas = usuarias.filter((u) => u.activa).map((u) => ({ id: u.id, nombre: u.nombre }));

  return (
    <div>
      <MarcaCabecera marca={marca} activa="leads" />
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <Link href={`/panel/ventas/${slug}/leads`} style={{ fontSize: 13, color: "#64748b", textDecoration: "none" }}>← Leads</Link>
        <h2 style={{ margin: 0, fontSize: 22 }}>{lead.negocio}</h2>
        <FaseEtiqueta fase={lead.fase} />
        {lead.excluido && <span style={{ fontSize: 12, fontWeight: 700, color: "#b91c1c" }}>EXCLUIDO · ya era cliente de la marca</span>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 340px) 1fr", gap: 16, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <section style={{ ...tarjeta, display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
            <div><strong>Código de cliente:</strong> <code>{lead.codigo_cliente}</code></div>
            <div><strong>Origen:</strong> {ORIGEN_LABELS[lead.origen]}{lead.origen_detalle ? ` · ${lead.origen_detalle}` : ""}</div>
            <div><strong>Alta:</strong> {formatoFechaHora(lead.created_at)}</div>
            <div><strong>Próximo seguimiento:</strong> {lead.proximo_seguimiento ? formatoFecha(lead.proximo_seguimiento) : "—"}</div>
            {lead.telefono && <a href={`tel:${lead.telefono}`} style={{ color: "#187bef", fontWeight: 600 }}>Llamar a {lead.telefono}</a>}
            <Asignacion slug={slug} leadId={lead.id} asignadaA={lead.asignada_a} usuarias={activas} />
          </section>
          <DatosLead slug={slug} lead={lead} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <AccionesLead slug={slug} leadId={lead.id} fase={lead.fase} proximoSeguimiento={lead.proximo_seguimiento} />
          <section style={tarjeta}>
            <h2 style={titulo}>Historial</h2>
            <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {actividad.map((a) => {
                const d = describirActividad(a, nombres);
                return (
                  <li key={a.id} style={{ borderLeft: "3px solid #e2e8f0", paddingLeft: 10 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{d.titulo}</div>
                    {d.detalle && <div style={{ fontSize: 13, color: "#334155", whiteSpace: "pre-wrap" }}>{d.detalle}</div>}
                    <div style={{ fontSize: 12, color: "#64748b" }}>{d.autora} · {formatoFechaHora(a.created_at)}</div>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
