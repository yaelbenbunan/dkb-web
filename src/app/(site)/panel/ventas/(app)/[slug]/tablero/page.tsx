import Link from "next/link";
import { requireUsuaria } from "@/lib/ventas/auth";
import { listLeads, listUsuarias } from "@/lib/ventas/db";
import { TIPO_NEGOCIO_LABELS } from "@/lib/ventas/dominio";
import { hoyMadrid } from "@/lib/ventas/metricas";
import { estadoSeguimiento, iniciales } from "@/lib/ventas/tablero";
import { cargarMarca } from "../../../_componentes/cargarMarca";
import { MarcaCabecera } from "../../../_componentes/MarcaCabecera";
import { Tablero, type TarjetaLead } from "./Tablero";

export default async function TableroPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ mias?: string; atrasados?: string; q?: string }>;
}) {
  const usuaria = await requireUsuaria();
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const marca = await cargarMarca(slug);
  const mias = sp.mias === "1";
  const atrasados = sp.atrasados === "1";
  const q = (sp.q ?? "").trim().toLowerCase();
  const hoy = hoyMadrid();

  const [todos, usuarias] = await Promise.all([
    listLeads(marca.id, { asignadaA: mias ? usuaria.id : undefined }),
    listUsuarias(),
  ]);
  const nombres = new Map(usuarias.map((u) => [u.id, u.nombre]));

  // Al cliente solo van datos planos del lead: nada de la marca (lleva el secreto del webhook).
  const leads: TarjetaLead[] = todos
    .filter((l) => !atrasados || estadoSeguimiento(l.proximo_seguimiento, l.fase, hoy) === "atrasado")
    .filter((l) => !q || [l.negocio, l.ciudad, l.contacto].some((v) => v?.toLowerCase().includes(q)))
    .map((l) => {
      const nombre = l.asignada_a ? nombres.get(l.asignada_a) : undefined;
      return {
        id: l.id,
        negocio: l.negocio,
        tipo: l.tipo_negocio ? TIPO_NEGOCIO_LABELS[l.tipo_negocio] : null,
        ciudad: l.ciudad,
        telefono: l.telefono,
        fase: l.fase,
        excluido: l.excluido,
        proximo_seguimiento: l.proximo_seguimiento,
        created_at: l.created_at,
        asignada: nombre ? { nombre, iniciales: iniciales(nombre) } : null,
      };
    });

  const filtro = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const valores = { mias: mias ? "1" : undefined, atrasados: atrasados ? "1" : undefined, q: q || undefined, ...extra };
    Object.entries(valores).forEach(([k, v]) => v && p.set(k, v));
    const s = p.toString();
    return `/panel/ventas/${slug}/tablero${s ? `?${s}` : ""}`;
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
      <MarcaCabecera marca={marca} activa="tablero" />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <Link href={filtro({ mias: undefined, atrasados: undefined, q: undefined })} style={chip(!mias && !atrasados && !q)}>Todos</Link>
          <Link href={filtro({ mias: mias ? undefined : "1" })} style={chip(mias)}>Solo mías</Link>
          <Link href={filtro({ atrasados: atrasados ? undefined : "1" })} style={chip(atrasados)}>Seguimiento atrasado</Link>
          <span style={{ fontSize: 13, color: "#64748b", marginLeft: 6 }}>{leads.length} leads</span>
          <form action={`/panel/ventas/${slug}/tablero`} style={{ marginLeft: "auto" }}>
            {mias && <input type="hidden" name="mias" value="1" />}
            {atrasados && <input type="hidden" name="atrasados" value="1" />}
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar negocio, ciudad, contacto…"
              aria-label="Buscar en el tablero"
              style={{ padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13 }}
            />
          </form>
        </div>

        <Tablero slug={slug} leads={leads} hoy={hoy} filtrosLista={{ mias, q }} />
      </div>
    </div>
  );
}
