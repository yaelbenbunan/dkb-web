import Link from "next/link";
import { requireUsuaria } from "@/lib/ventas/auth";
import { listLeads, listUsuarias } from "@/lib/ventas/db";
import { FASES, FASE_LABELS, ORIGEN_LABELS, TIPO_NEGOCIO_LABELS, esFase, esFaseActiva } from "@/lib/ventas/dominio";
import { formatoFecha, hoyMadrid } from "@/lib/ventas/metricas";
import { cargarMarca } from "../../../_componentes/cargarMarca";
import { FaseEtiqueta } from "../../../_componentes/FaseEtiqueta";
import { MarcaCabecera } from "../../../_componentes/MarcaCabecera";
import { tarjeta, td, th } from "../../../_componentes/estilos";
import { ImportarLeads } from "./ImportarLeads";
import { NuevoLeadForm } from "./NuevoLeadForm";

export default async function LeadsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ fase?: string; mias?: string; q?: string }>;
}) {
  const usuaria = await requireUsuaria();
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const marca = await cargarMarca(slug);
  const fase = esFase(sp.fase) ? sp.fase : undefined;
  const mias = sp.mias === "1";
  const q = (sp.q ?? "").trim().toLowerCase();

  const [todos, usuarias] = await Promise.all([
    listLeads(marca.id, { fase, asignadaA: mias ? usuaria.id : undefined }),
    listUsuarias(),
  ]);
  const nombres = Object.fromEntries(usuarias.map((u) => [u.id, u.nombre]));
  const leads = q
    ? todos.filter((l) => [l.negocio, l.ciudad, l.contacto, l.email, l.telefono].some((v) => v?.toLowerCase().includes(q)))
    : todos;
  const hoy = hoyMadrid();

  const filtro = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const valores = { fase, mias: mias ? "1" : undefined, q: q || undefined, ...extra };
    Object.entries(valores).forEach(([k, v]) => v && p.set(k, v));
    const s = p.toString();
    return `/panel/ventas/${slug}/leads${s ? `?${s}` : ""}`;
  };
  const chip = (activo: boolean) =>
    ({
      padding: "4px 10px",
      borderRadius: 999,
      fontSize: 13,
      textDecoration: "none",
      border: `1px solid ${activo ? "#187bef" : "#cbd5e1"}`,
      color: activo ? "#187bef" : "#475569",
      background: activo ? "#eff6ff" : "#fff",
    }) as const;

  return (
    <div>
      <MarcaCabecera marca={marca} activa="leads" />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <Link href={filtro({ fase: undefined })} style={chip(!fase)}>Todas</Link>
          {FASES.map((f) => (
            <Link key={f} href={filtro({ fase: f })} style={chip(fase === f)}>{FASE_LABELS[f]}</Link>
          ))}
          <Link href={filtro({ mias: mias ? undefined : "1" })} style={chip(mias)}>Solo mías</Link>
          <form action={`/panel/ventas/${slug}/leads`} style={{ marginLeft: "auto" }}>
            {fase && <input type="hidden" name="fase" value={fase} />}
            {mias && <input type="hidden" name="mias" value="1" />}
            <input name="q" defaultValue={q} placeholder="Buscar negocio, ciudad…" style={{ padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13 }} />
          </form>
        </div>

        <section style={{ ...tarjeta, padding: 0, overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 860 }}>
            <thead>
              <tr>
                <th style={th}>Negocio</th>
                <th style={th}>Tipo</th>
                <th style={th}>Ciudad</th>
                <th style={th}>Fase</th>
                <th style={th}>Asignada</th>
                <th style={th}>Seguimiento</th>
                <th style={th}>Origen</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 && (
                <tr><td style={{ ...td, color: "#64748b" }} colSpan={7}>No hay leads con este filtro.</td></tr>
              )}
              {leads.map((l) => {
                const atrasado = l.proximo_seguimiento !== null && l.proximo_seguimiento < hoy && esFaseActiva(l.fase);
                return (
                  <tr key={l.id}>
                    <td style={td}>
                      <Link href={`/panel/ventas/${slug}/leads/${l.id}`} style={{ color: "#187bef", fontWeight: 600, textDecoration: "none" }}>
                        {l.negocio}
                      </Link>
                      {l.excluido && <span style={{ marginLeft: 6, fontSize: 11, color: "#b91c1c", fontWeight: 700 }}>EXCLUIDO</span>}
                    </td>
                    <td style={td}>{l.tipo_negocio ? TIPO_NEGOCIO_LABELS[l.tipo_negocio] : "—"}</td>
                    <td style={td}>{l.ciudad ?? "—"}</td>
                    <td style={td}><FaseEtiqueta fase={l.fase} /></td>
                    <td style={td}>{l.asignada_a ? (nombres[l.asignada_a] ?? "—") : "—"}</td>
                    <td style={{ ...td, color: atrasado ? "#b91c1c" : td.color, fontWeight: atrasado ? 700 : 400 }}>
                      {l.proximo_seguimiento ? formatoFecha(l.proximo_seguimiento) : "—"}
                    </td>
                    <td style={td}>
                      {ORIGEN_LABELS[l.origen]}
                      {l.origen_detalle && <div style={{ fontSize: 12, color: "#64748b" }}>{l.origen_detalle}</div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
        <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{leads.length} leads</p>

        <ImportarLeads slug={slug} />
        <NuevoLeadForm slug={slug} />
      </div>
    </div>
  );
}
