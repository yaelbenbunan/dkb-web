import Link from "next/link";
import { requireAccesoMarca } from "@/lib/ventas/auth";
import { listLeads, listUsuarias } from "@/lib/ventas/db";
import { FASE_LABELS, ORIGEN_LABELS, TIPO_NEGOCIO_LABELS, esFase, flujoDeMarca } from "@/lib/ventas/dominio";
import { ahoraMadrid, formatoSeguimiento } from "@/lib/ventas/metricas";
import { filtrarPorOrigen, leerFiltroOrigen, opcionesOrigen } from "@/lib/ventas/filtros-origen";
import { estadoSeguimiento } from "@/lib/ventas/tablero";
import { isLeadEmailable } from "@/lib/lead-emailable";
import { FiltrosOrigen } from "../../../_componentes/FiltrosOrigen";
import { FaseEtiqueta } from "../../../_componentes/FaseEtiqueta";
import { MarcaCabecera } from "../../../_componentes/MarcaCabecera";
import { tarjeta, td, th } from "../../../_componentes/estilos";
import { BotonesLeads } from "./BotonesLeads";

const FECHA_ENTRADA = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "Europe/Madrid" });
const secundario = { fontSize: 12, color: "#64748b" } as const;
const texto = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
/** Se le puede mandar un mailing comercial: la misma regla que usa el envío de campañas. */
const admiteMailing = (l: { email: string | null; consentimiento?: boolean | null; email_estado?: string | null }) =>
  isLeadEmailable({ email: l.email, consent: l.consentimiento ?? null, email_status: l.email_estado ?? null });

export default async function LeadsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ fase?: string; mias?: string; q?: string; canal?: string; campana?: string; etiqueta?: string; archivados?: string; mailing?: string }>;
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const { usuaria, marca } = await requireAccesoMarca(slug, "leads");
  const fase = esFase(sp.fase) ? sp.fase : undefined;
  const mias = sp.mias === "1";
  const q = (sp.q ?? "").trim().toLowerCase();
  const origen = leerFiltroOrigen(sp);
  const archivados = sp.archivados === "1";
  // Los archivados no reciben campañas: en esa vista el filtro no aplica.
  const mailing = sp.mailing === "1" && !archivados;

  const [cargados, usuarias, enArchivo] = await Promise.all([
    listLeads(marca.id, { fase, asignadaA: mias ? usuaria.id : undefined, archivados }),
    listUsuarias(),
    archivados ? Promise.resolve(null) : listLeads(marca.id, { fase, asignadaA: mias ? usuaria.id : undefined, archivados: true }),
  ]);
  const opciones = opcionesOrigen(cargados);
  const todos = filtrarPorOrigen(cargados, origen);
  const nombres = Object.fromEntries(usuarias.map((u) => [u.id, u.nombre]));
  const buscados = q
    ? todos.filter((l) => [l.negocio, l.ciudad, l.contacto, l.email, l.telefono, l.canal, l.campana, l.origen_detalle].some((v) => v?.toLowerCase().includes(q)))
    : todos;
  const conMailing = buscados.filter(admiteMailing);
  const conEmail = buscados.filter((l) => texto(l.email)).length;
  const leads = mailing ? conMailing : buscados;
  const ahora = ahoraMadrid();

  const filtro = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const valores = { fase, mias: mias ? "1" : undefined, q: q || undefined, ...origen, archivados: archivados ? "1" : undefined, mailing: mailing ? "1" : undefined, ...extra };
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
      <MarcaCabecera marca={marca} activa="leads" rol={usuaria.rol} />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <Link href={filtro({ fase: undefined })} style={chip(!fase)}>Todas</Link>
          {flujoDeMarca(marca.slug).fases.map((f) => (
            <Link key={f} href={filtro({ fase: f })} style={chip(fase === f)}>{FASE_LABELS[f]}</Link>
          ))}
          <Link href={filtro({ mias: mias ? undefined : "1" })} style={chip(mias)}>Solo mías</Link>
          {!archivados && (
            <Link
              href={filtro({ mailing: mailing ? undefined : "1" })}
              style={chip(mailing)}
              title="Consentimiento «sí», con email y sin rebotes ni quejas"
            >
              Mailing comercial ({conMailing.length})
            </Link>
          )}
          <Link href={filtro({ archivados: archivados ? undefined : "1", mailing: undefined })} style={chip(archivados)}>
            {archivados ? "Ver activos" : `Archivados (${enArchivo?.length ?? 0})`}
          </Link>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <form action={`/panel/ventas/${slug}/leads`}>
              {fase && <input type="hidden" name="fase" value={fase} />}
              {mias && <input type="hidden" name="mias" value="1" />}
              {mailing && <input type="hidden" name="mailing" value="1" />}
              <input name="q" defaultValue={q} placeholder="Buscar negocio, ciudad, campaña…" style={{ padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13 }} />
            </form>
            <BotonesLeads slug={slug} />
          </div>
        </div>
        <FiltrosOrigen
          accion={`/panel/ventas/${slug}/leads`}
          valores={origen}
          opciones={opciones}
          ocultos={{ fase, mias: mias ? "1" : undefined, q: q || undefined, archivados: archivados ? "1" : undefined, mailing: mailing ? "1" : undefined }}
        />

        {mailing && (
          <p style={{ margin: 0, fontSize: 13, color: "#334155", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "8px 12px" }}>
            <strong>{conMailing.length}</strong> de {conEmail} leads con email admiten un mailing comercial: tienen el consentimiento marcado como «sí» y su correo no ha rebotado ni nos ha marcado como spam. Los que no lo tienen se pueden pedir y marcar en la ficha, en «Origen».
          </p>
        )}

        <section style={{ ...tarjeta, padding: 0, overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 1280 }}>
            <thead>
              <tr>
                <th style={th}>Negocio</th>
                <th style={th}>Contacto</th>
                <th style={th}>Estado</th>
                <th style={th}>Asignada</th>
                <th style={th}>Seguimiento</th>
                <th style={th}>Canal</th>
                <th style={th}>Campaña</th>
                <th style={th}>Anuncio</th>
                <th style={th}>Tipo</th>
                <th style={th}>Ciudad</th>
                <th style={th}>Entrada</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 && (
                <tr><td style={{ ...td, color: "#64748b" }} colSpan={11}>No hay leads con este filtro.</td></tr>
              )}
              {leads.map((l) => {
                const atrasado = estadoSeguimiento(l.proximo_seguimiento, l.proximo_seguimiento_hora ?? null, l.fase, ahora) === "atrasado";
                const campana = l.campana ?? l.origen_detalle;
                const conjunto = texto(l.extra?.adset_name);
                const anuncio = texto(l.extra?.ad_name);
                return (
                  <tr key={l.id}>
                    <td style={td}>
                      <Link href={`/panel/ventas/${slug}/leads/${l.id}`} style={{ color: "#187bef", fontWeight: 600, textDecoration: "none" }}>
                        {l.negocio}
                      </Link>
                      {l.excluido && <span style={{ marginLeft: 6, fontSize: 11, color: "#b91c1c", fontWeight: 700 }}>EXCLUIDO</span>}
                      {(l.etiquetas ?? []).length > 0 && <div style={{ fontSize: 11, color: "#3730a3" }}>{(l.etiquetas ?? []).join(" · ")}</div>}
                    </td>
                    <td style={td}>
                      {l.contacto ?? "—"}
                      {l.telefono && (
                        <div style={secundario}>
                          <a href={`tel:${l.telefono}`} style={{ color: "inherit" }}>{l.telefono}</a>
                        </div>
                      )}
                      {l.email && <div style={{ ...secundario, wordBreak: "break-all" }}>{l.email}</div>}
                    </td>
                    <td style={td}><FaseEtiqueta fase={l.fase} /></td>
                    <td style={td}>{l.asignada_a ? (nombres[l.asignada_a] ?? "—") : "—"}</td>
                    <td style={{ ...td, color: atrasado ? "#b91c1c" : td.color, fontWeight: atrasado ? 700 : 400 }}>
                      {l.proximo_seguimiento ? formatoSeguimiento(l.proximo_seguimiento, l.proximo_seguimiento_hora ?? null) : "—"}
                    </td>
                    <td style={td}>
                      {l.canal ?? "—"}
                      <div style={secundario}>{ORIGEN_LABELS[l.origen]}</div>
                    </td>
                    <td style={td}>{campana ?? "—"}</td>
                    <td style={td}>
                      {anuncio ?? "—"}
                      {conjunto && <div style={secundario}>{conjunto}</div>}
                    </td>
                    <td style={td}>{l.tipo_negocio ? TIPO_NEGOCIO_LABELS[l.tipo_negocio] : "—"}</td>
                    <td style={td}>{l.ciudad ?? "—"}</td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>{FECHA_ENTRADA.format(new Date(l.created_at))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
        <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{leads.length} leads</p>

      </div>
    </div>
  );
}
