import Link from "next/link";
import { requireAccesoMarca } from "@/lib/ventas/auth";
import { listLeads, listLlamadasMarca, listTareasMarca, listUsuarias } from "@/lib/ventas/db";
import { esFaseActiva } from "@/lib/ventas/dominio";
import { esAsignableEnMarca } from "@/lib/ventas/rutas";
import { ahoraMadrid } from "@/lib/ventas/metricas";
import { agruparTareas, contarPrimerContacto, leadsQuePidenMuestras, tareasAutomaticas, tareasManuales, type SeccionTarea } from "@/lib/ventas/tareas";
import { MarcaCabecera } from "../../../_componentes/MarcaCabecera";
import { tarjeta, titulo } from "../../../_componentes/estilos";
import { FilaTarea } from "./FilaTarea";
import { NuevaTareaForm } from "./NuevaTareaForm";

const SECCIONES: { clave: SeccionTarea; texto: string }[] = [
  { clave: "atrasadas", texto: "Atrasadas" },
  { clave: "hoy", texto: "Hoy" },
  { clave: "proximas", texto: "Próximas" },
  { clave: "sin_fecha", texto: "Sin fecha" },
];
const TREINTA_DIAS = 30 * 86_400_000;

/** Fuera del componente: la página se renderiza en servidor, cada petición pide «ahora». */
function haceTreintaDias(): string {
  return new Date(Date.now() - TREINTA_DIAS).toISOString();
}

export default async function TareasPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ de?: string; hechas?: string }>;
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const { usuaria, marca } = await requireAccesoMarca(slug, "tareas");
  const verHechas = sp.hechas === "1";

  const [leads, llamadas, manuales, usuarias] = await Promise.all([
    listLeads(marca.id),
    listLlamadasMarca(marca.id),
    listTareasMarca(marca.id, verHechas ? { hechasDesde: haceTreintaDias() } : {}),
    listUsuarias(),
  ]);
  // Solo a quien se le puede asignar en esta marca; `nombres` sigue con todas para mostrar responsables.
  const activas = usuarias.filter((u) => esAsignableEnMarca(u, marca.id)).map((u) => ({ id: u.id, nombre: u.nombre }));
  const nombres = Object.fromEntries(usuarias.map((u) => [u.id, u.nombre]));
  // Solo leads en fase activa, por nombre: una tarea sobre un lead cerrado no tiene dónde verse.
  const leadsParaTarea = leads
    .filter((l) => esFaseActiva(l.fase))
    .sort((a, b) => a.negocio.localeCompare(b.negocio, "es"))
    .map((l) => ({ id: l.id, negocio: l.negocio }));
  // «de» filtra por responsable: «yo», el id de una usuaria, o vacío para todas.
  const de = sp.de === "yo" ? usuaria.id : activas.some((u) => u.id === sp.de) ? sp.de : undefined;

  const todas = [
    ...tareasAutomaticas(leads, leadsQuePidenMuestras(llamadas)),
    ...tareasManuales(manuales, new Map(leads.map((l) => [l.id, l.negocio]))),
  ].filter((t) => !de || t.asignadaA === de);
  const grupos = agruparTareas(todas, ahoraMadrid());
  const hechas = verHechas ? todas.filter((t) => t.hecha) : [];
  const sinContactar = contarPrimerContacto(leads);

  const base = `/panel/ventas/${slug}/tareas`;
  const url = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    Object.entries({ de: sp.de, hechas: verHechas ? "1" : undefined, ...extra }).forEach(([k, v]) => v && p.set(k, v));
    const s = p.toString();
    return s ? `${base}?${s}` : base;
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
      <MarcaCabecera marca={marca} activa="tareas" rol={usuaria.rol} />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <Link href={url({ de: undefined })} style={chip(!sp.de)}>Todas</Link>
          <Link href={url({ de: "yo" })} style={chip(sp.de === "yo")}>Solo mías</Link>
          {activas.filter((u) => u.id !== usuaria.id).map((u) => (
            <Link key={u.id} href={url({ de: u.id })} style={chip(sp.de === u.id)}>{u.nombre}</Link>
          ))}
          <Link href={url({ hechas: verHechas ? undefined : "1" })} style={{ ...chip(verHechas), marginLeft: "auto" }}>Hechas (30 días)</Link>
        </div>

        <NuevaTareaForm slug={slug} usuarias={activas} leads={leadsParaTarea} yo={usuaria.id} />

        {sinContactar > 0 && (
          <Link href={`/panel/ventas/${slug}/leads?fase=nuevo`} style={{ ...tarjeta, textDecoration: "none", color: "#0f172a", fontSize: 14 }}>
            <strong>{sinContactar}</strong> {sinContactar === 1 ? "lead nuevo sin contactar" : "leads nuevos sin contactar"} →
          </Link>
        )}

        {SECCIONES.map(({ clave, texto }) => (
          <section key={clave} style={tarjeta}>
            <h2 style={{ ...titulo, color: clave === "atrasadas" && grupos[clave].length ? "#b91c1c" : undefined }}>
              {texto} ({grupos[clave].length})
            </h2>
            {grupos[clave].length === 0 ? (
              <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>Nada pendiente.</p>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                {grupos[clave].map((t) => (
                  <FilaTarea key={t.clave} slug={slug} tarea={t} usuarias={activas} responsable={t.asignadaA ? (nombres[t.asignadaA] ?? "—") : null} atrasada={clave === "atrasadas"} />
                ))}
              </ul>
            )}
          </section>
        ))}

        {verHechas && (
          <section style={tarjeta}>
            <h2 style={titulo}>Hechas en los últimos 30 días ({hechas.length})</h2>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              {hechas.map((t) => (
                <FilaTarea key={t.clave} slug={slug} tarea={t} usuarias={activas} responsable={t.asignadaA ? (nombres[t.asignadaA] ?? "—") : null} atrasada={false} />
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
