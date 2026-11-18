import Link from "next/link";
import { requireAccesoMarca } from "@/lib/ventas/auth";
import { listLeads, listLlamadasMarca, listTareasMarca, listTareasProyecto, listUsuarias, SQL_FICHAS } from "@/lib/ventas/db";
import { esMarcaPropia } from "@/lib/ventas/espacios";
import { agruparProyectos, pendientesDePlantilla, servicio } from "@/lib/ventas/proyectos";
import { esFaseActiva } from "@/lib/ventas/dominio";
import { esAsignableEnMarca } from "@/lib/ventas/rutas";
import { ahoraMadrid } from "@/lib/ventas/metricas";
import { agruparTareas, contarPrimerContacto, leadsQuePidenMuestras, tareasAutomaticas, tareasManuales, type SeccionTarea } from "@/lib/ventas/tareas";
import { MarcaCabecera } from "../../../_componentes/MarcaCabecera";
import { tarjeta, titulo } from "../../../_componentes/estilos";
import { FilaTarea } from "./FilaTarea";
import { NuevaTareaForm } from "./NuevaTareaForm";
import { AnadirPlantilla, type PlantillaPendiente } from "./AnadirPlantilla";

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

  const conProyectos = !esMarcaPropia(marca.slug);
  const [leads, llamadas, todasManuales, usuarias, deProyecto] = await Promise.all([
    listLeads(marca.id),
    listLlamadasMarca(marca.id),
    listTareasMarca(marca.id, verHechas ? { hechasDesde: haceTreintaDias() } : {}),
    listUsuarias(),
    conProyectos ? listTareasProyecto(marca.id) : null,
  ]);
  // Las de proyecto van en su bloque, por servicio y fase: no se repiten abajo.
  const manuales = todasManuales.filter((t) => !t.proyecto);
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
    ...tareasAutomaticas(leads, leadsQuePidenMuestras(llamadas), marca.slug),
    ...tareasManuales(manuales, new Map(leads.map((l) => [l.id, l.negocio]))),
  ].filter((t) => !de || t.asignadaA === de);
  const grupos = agruparTareas(todas, ahoraMadrid());
  const hechas = verHechas ? todas.filter((t) => t.hecha) : [];
  const sinContactar = contarPrimerContacto(leads);

  // Proyectos: tareas de las plantillas de los servicios contratados (ficha del cliente).
  const equipo = usuaria.rol === "admin" || usuaria.rol === "comercial";
  const negocios = new Map(leads.map((l) => [l.id, l.negocio]));
  const proyectos = deProyecto?.estado === "ok" ? agruparProyectos(deProyecto.tareas) : [];
  const vistaDe = new Map(deProyecto?.estado === "ok" ? tareasManuales(deProyecto.tareas, negocios).map((v) => [v.tareaId, v]) : []);
  const contratados = Array.isArray(marca.servicios) ? marca.servicios : [];
  const plantillas: PlantillaPendiente[] =
    deProyecto?.estado === "ok"
      ? contratados.flatMap((clave) => {
          const s = servicio(clave);
          const pendientes = pendientesDePlantilla(clave, deProyecto.tareas);
          if (!s || !pendientes.length) return [];
          return [{
            clave,
            nombre: s.nombre,
            fases: s.fases
              .map((f) => ({ nombre: f.nombre, tareas: pendientes.filter((t) => t.fase === f.nombre).map((t) => ({ clave: t.clave, titulo: t.titulo })) }))
              .filter((f) => f.tareas.length),
          }];
        })
      : [];

  const base = `/panel/${slug}/tareas`;
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

        {conProyectos && (
          <section style={{ ...tarjeta, display: "flex", flexDirection: "column", gap: 14 }}>
            <h2 style={{ ...titulo, margin: 0 }}>Proyectos</h2>
            {deProyecto?.estado === "falta_migracion" ? (
              <p style={{ margin: 0, fontSize: 14, color: "#92400e", background: "#fef3c7", borderRadius: 8, padding: "10px 12px" }}>
                Para las tareas por proyecto falta ejecutar en Supabase {SQL_FICHAS}.
              </p>
            ) : (
              <>
                {proyectos.length === 0 && (
                  <p style={{ margin: 0, fontSize: 14, color: "#64748b" }}>
                    Aún no hay proyectos. {contratados.length === 0 ? "Marca primero los servicios contratados en la " : "Añade las tareas de un servicio cuando toque empezarlo."}
                    {contratados.length === 0 && <Link href={`/panel/${slug}/ficha`} style={{ color: "#187bef" }}>ficha</Link>}
                  </p>
                )}
                {proyectos.map((p) => (
                  <div key={p.clave} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <strong style={{ fontSize: 16, flex: "1 1 160px" }}>{p.nombre}</strong>
                      <span style={{ fontSize: 13, color: "#475569" }}>{p.hechas} de {p.total} hechas</span>
                      <span aria-hidden="true" style={{ flex: "0 1 160px", minWidth: 80, height: 8, background: "#e2e8f0", borderRadius: 99, overflow: "hidden" }}>
                        <span style={{ display: "block", height: "100%", width: `${Math.round((p.hechas / p.total) * 100)}%`, background: "#187bef" }} />
                      </span>
                    </div>
                    {p.fases.map((f) => (
                      <div key={f.nombre} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <h3 style={{ margin: "6px 0 0", fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: "#475569" }}>
                          {f.nombre} · {f.hechas}/{f.total}
                        </h3>
                        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                          {f.tareas.map((t) => {
                            const v = vistaDe.get(t.id);
                            return v ? (
                              <FilaTarea key={t.id} slug={slug} tarea={v} usuarias={activas} responsable={v.asignadaA ? (nombres[v.asignadaA] ?? "—") : null} atrasada={false} />
                            ) : null;
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                ))}
                {equipo && plantillas.length > 0 && <AnadirPlantilla slug={slug} plantillas={plantillas} />}
              </>
            )}
          </section>
        )}

        <NuevaTareaForm slug={slug} usuarias={activas} leads={leadsParaTarea} yo={usuaria.id} />

        {sinContactar > 0 && (
          <Link href={`/panel/${slug}/leads?fase=nuevo`} style={{ ...tarjeta, textDecoration: "none", color: "#0f172a", fontSize: 14 }}>
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
