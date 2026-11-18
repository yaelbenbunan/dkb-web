import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUsuaria } from "@/lib/ventas/auth";
import { getMarcaPorId, listMarcas, listTareasPendientesTodas, listUsuarias } from "@/lib/ventas/db";
import { COLOR_DINKBIT, colorDeCliente, esMarcaPropia, filtrarTareasGlobal } from "@/lib/ventas/espacios";
import { ahoraMadrid } from "@/lib/ventas/metricas";
import { esAsignableEnMarca, inicioDeMarca, rolConMarca } from "@/lib/ventas/rutas";
import { agruparTareas, tareasManuales, type SeccionTarea, type TareaVista } from "@/lib/ventas/tareas";
import { tarjeta, titulo } from "../../_componentes/estilos";
import { FilaTarea } from "../[slug]/tareas/FilaTarea";

const SECCIONES: { clave: SeccionTarea; texto: string }[] = [
  { clave: "atrasadas", texto: "Atrasadas" },
  { clave: "hoy", texto: "Hoy" },
  { clave: "proximas", texto: "Próximas" },
  { clave: "sin_fecha", texto: "Sin fecha" },
];

type TareaGlobal = TareaVista & { slug: string | null; marcaId: string; marcaNombre: string };

/**
 * Todas las tareas manuales pendientes, de dinkbit y de cada cliente, con
 * filtro por ámbito y por responsable. Las automáticas (llamar, muestras) se
 * deducen de los leads de cada marca y siguen en la página de tareas de cada una.
 */
export default async function TareasGlobalPage({ searchParams }: { searchParams: Promise<{ ambito?: string; de?: string }> }) {
  const usuaria = await requireUsuaria();
  if (rolConMarca(usuaria.rol)) {
    const marca = usuaria.marca_id ? await getMarcaPorId(usuaria.marca_id) : null;
    redirect(marca ? inicioDeMarca(usuaria.rol, marca.slug) : "/panel/login?aviso=sin-marca");
  }
  const sp = await searchParams;
  const [filas, usuarias, marcas] = await Promise.all([listTareasPendientesTodas(), listUsuarias(), listMarcas()]);

  const clientes = marcas
    .filter((m) => m.estado !== "finalizada" && !esMarcaPropia(m.slug))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  const ambitos = ["dinkbit", "clientes", ...clientes.map((c) => c.slug)];
  const ambito = sp.ambito && ambitos.includes(sp.ambito) ? sp.ambito : undefined;
  const soloMias = sp.de === "yo";

  const negocios = new Map(filas.filter((f) => f.lead_id && f.lead).map((f) => [f.lead_id as string, f.lead!.negocio]));
  const vistas = tareasManuales(filas, negocios);
  const todas: TareaGlobal[] = vistas.map((v, i) => ({
    ...v,
    slug: filas[i].marca?.slug ?? null,
    marcaId: filas[i].marca_id,
    marcaNombre: filas[i].marca?.nombre ?? "—",
  }));
  const visibles = filtrarTareasGlobal(todas, { yo: usuaria.id, ambito, soloMias });
  const grupos = agruparTareas(visibles, ahoraMadrid()) as Record<SeccionTarea, TareaGlobal[]>;
  const nombres = Object.fromEntries(usuarias.map((u) => [u.id, u.nombre]));

  const url = (extra: { ambito?: string; de?: string }) => {
    const p = new URLSearchParams();
    const valores = { ambito, de: soloMias ? "yo" : undefined, ...extra };
    Object.entries(valores).forEach(([k, v]) => v && p.set(k, v));
    const s = p.toString();
    return s ? `/panel/tareas?${s}` : "/panel/tareas";
  };
  const chip = (activo: boolean) =>
    ({
      padding: "6px 12px",
      borderRadius: 999,
      fontSize: 13,
      textDecoration: "none",
      border: `1px solid ${activo ? "#0f172a" : "#cbd5e1"}`,
      color: activo ? "#fff" : "#334155",
      background: activo ? "#0f172a" : "#fff",
    }) as const;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h1 style={{ margin: 0, fontSize: 24 }}>Tareas</h1>
      <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
        Las tareas pendientes de dinkbit y de cada cliente. Para crear una, entra en la pestaña Tareas de Dinkbit o del cliente. Las llamadas y muestras que salen solas de los leads están en esa misma pestaña.
      </p>
      <nav aria-label="Filtrar por ámbito" style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <Link href={url({ ambito: undefined })} style={chip(!ambito)}>Todas</Link>
        <Link href={url({ ambito: "dinkbit" })} style={chip(ambito === "dinkbit")}>Dinkbit</Link>
        <Link href={url({ ambito: "clientes" })} style={chip(ambito === "clientes")}>Todos los clientes</Link>
        {clientes.map((c) => (
          <Link key={c.slug} href={url({ ambito: c.slug })} style={chip(ambito === c.slug)}>{c.nombre}</Link>
        ))}
        <Link href={url({ de: soloMias ? undefined : "yo" })} style={{ ...chip(soloMias), marginLeft: "auto" }}>Solo mías</Link>
      </nav>

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
                <FilaTarea
                  key={t.clave}
                  slug={t.slug ?? ""}
                  tarea={t}
                  usuarias={usuarias.filter((u) => esAsignableEnMarca(u, t.marcaId)).map((u) => ({ id: u.id, nombre: u.nombre }))}
                  responsable={t.asignadaA ? (nombres[t.asignadaA] ?? "—") : null}
                  atrasada={clave === "atrasadas"}
                  ambito={
                    t.slug && esMarcaPropia(t.slug)
                      ? { nombre: "Dinkbit", color: COLOR_DINKBIT }
                      : { nombre: t.marcaNombre, color: t.slug ? colorDeCliente(t.slug) : "#94a3b8" }
                  }
                />
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
