import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUsuaria } from "@/lib/ventas/auth";
import { inicioDeMarca, rolConMarca } from "@/lib/ventas/rutas";
import { getMarcaPorId, listSeguimientosUsuaria, listTareasUsuaria, type LeadConMarca } from "@/lib/ventas/db";
import { TIPO_NEGOCIO_LABELS } from "@/lib/ventas/dominio";
import { COLOR_DINKBIT, separarPorEspacio } from "@/lib/ventas/espacios";
import { ahoraMadrid, formatoFecha, formatoSeguimiento } from "@/lib/ventas/metricas";
import { pendientesDelDia } from "@/lib/ventas/recordatorio-diario";
import { FaseEtiqueta } from "../../_componentes/FaseEtiqueta";
import { tarjeta, td, th } from "../../_componentes/estilos";

type TareaDelDia = Awaited<ReturnType<typeof listTareasUsuaria>>[number];

const subtitulo = { margin: "0 0 8px", fontSize: 14, color: "#334155" } as const;
const vacio = <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>Nada pendiente.</p>;

function Tabla({ leads, atrasados, conMarca }: { leads: LeadConMarca[]; atrasados: boolean; conMarca: boolean }) {
  if (leads.length === 0) return vacio;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 640 }}>
        <thead>
          <tr>
            <th style={th}>Negocio</th>
            {conMarca && <th style={th}>Cliente</th>}
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
              {conMarca && <td style={td}>{l.marca?.nombre ?? "—"}</td>}
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

function Tareas({ tareas, conMarca }: { tareas: { t: TareaDelDia; estado: string }[]; conMarca: boolean }) {
  if (tareas.length === 0) return vacio;
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
      {tareas.map(({ t, estado }) => (
        <li key={t.id}>
          <Link
            href={`/panel/ventas/${t.marca?.slug}/tareas?de=yo`}
            style={{ display: "flex", gap: 10, flexWrap: "wrap", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 8, textDecoration: "none", fontSize: 14, color: "#0f172a" }}
          >
            <strong style={{ flex: "1 1 220px" }}>{t.titulo}</strong>
            {conMarca && <span style={{ color: "#64748b" }}>{t.marca?.nombre ?? "—"}</span>}
            <span style={{ fontWeight: estado === "atrasado" ? 700 : 400, color: estado === "atrasado" ? "#b91c1c" : "#334155" }}>
              {t.vence ? formatoSeguimiento(t.vence, t.vence_hora) : ""}
            </span>
            {t.notas && <span style={{ flexBasis: "100%", fontSize: 13, color: "#475569", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{t.notas}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Bloque({
  titulo,
  color,
  atrasados,
  deHoy,
  tareas,
  conMarca,
}: {
  titulo: string;
  color: string;
  atrasados: LeadConMarca[];
  deHoy: LeadConMarca[];
  tareas: { t: TareaDelDia; estado: string }[];
  conMarca: boolean;
}) {
  return (
    <section style={{ ...tarjeta, borderTop: `4px solid ${color}`, display: "flex", flexDirection: "column", gap: 18 }}>
      <h2 style={{ margin: 0, fontSize: 18, color }}>{titulo}</h2>
      <div>
        <h3 style={{ ...subtitulo, color: atrasados.length ? "#b91c1c" : subtitulo.color }}>Seguimientos atrasados ({atrasados.length})</h3>
        <Tabla leads={atrasados} atrasados conMarca={conMarca} />
      </div>
      <div>
        <h3 style={subtitulo}>Seguimientos para hoy ({deHoy.length})</h3>
        <Tabla leads={deHoy} atrasados={false} conMarca={conMarca} />
      </div>
      <div>
        <h3 style={subtitulo}>Tareas ({tareas.length})</h3>
        <Tareas tareas={tareas} conMarca={conMarca} />
      </div>
    </section>
  );
}

export default async function MiDiaPage({ searchParams }: { searchParams: Promise<{ aviso?: string }> }) {
  const usuaria = await requireUsuaria();
  if (rolConMarca(usuaria.rol)) {
    const marca = usuaria.marca_id ? await getMarcaPorId(usuaria.marca_id) : null;
    redirect(marca ? inicioDeMarca(usuaria.rol, marca.slug) : "/panel/ventas/login?aviso=sin-marca");
  }
  const { aviso } = await searchParams;
  const ahora = ahoraMadrid();
  const [seguimientos, tareas] = await Promise.all([listSeguimientosUsuaria(usuaria.id, ahora.fecha), listTareasUsuaria(usuaria.id)]);
  // El estado mira la hora: un seguimiento de hoy a las 10:00 ya es atrasado a las 11:00.
  // Es el mismo filtro que el correo de la mañana, para que cuenten igual.
  const { seguimientosAtrasados, seguimientosHoy, tareas: misTareas } = pendientesDelDia(seguimientos, tareas, ahora);
  const atrasados = separarPorEspacio(seguimientosAtrasados, (l) => l.marca?.slug);
  const deHoy = separarPorEspacio(seguimientosHoy, (l) => l.marca?.slug);
  const delDia = separarPorEspacio(misTareas, (x) => x.t.marca?.slug);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {aviso === "permiso" && <p style={{ margin: 0, color: "#b45309", fontWeight: 600 }}>Esa sección es solo para admin.</p>}
      <h1 style={{ margin: 0, fontSize: 24 }}>Mi día · {formatoFecha(ahora.fecha)}</h1>
      <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
        Lo tuyo con seguimiento o tarea para hoy o atrasado, separado entre lo nuestro y lo de los clientes. Al registrar una llamada, pon la fecha del siguiente paso para que vuelva a salir aquí.
      </p>
      <Bloque titulo="Dinkbit · nuestros leads" color={COLOR_DINKBIT} atrasados={atrasados.dinkbit} deHoy={deHoy.dinkbit} tareas={delDia.dinkbit} conMarca={false} />
      <Bloque titulo="Clientes" color="#334155" atrasados={atrasados.clientes} deHoy={deHoy.clientes} tareas={delDia.clientes} conMarca />
    </div>
  );
}
