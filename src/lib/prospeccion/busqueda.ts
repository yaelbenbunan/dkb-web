import "server-only";
import { constitucionAProspecto } from "./borme";
import { buscarConstituciones } from "./borme-db";
import { categoriaPorClave } from "./categorias";
import { claveTexto, quitarDuplicados } from "./contacto";
import { buscarLugares, huellasDeProspectos } from "./lugares-db";
import { buscarEnOsm, type ErrorOsm } from "./osm";
import { lugarAProspecto } from "./overture";
import { provinciaDeTexto } from "./provincias";
import type { ProspectoNuevo } from "./tipos";

/** Empresas que se guardan por búsqueda. Repetir la búsqueda trae las
 *  siguientes, porque las ya guardadas se descartan antes de cortar. */
export const MAX_POR_BUSQUEDA = 200;

export type ResultadoBusqueda =
  | {
      ok: true;
      fuente: "overture" | "osm";
      /** Las que hay que guardar: nuevas y sin duplicados. */
      prospectos: ProspectoNuevo[];
      /** Todo lo que devolvió la fuente. */
      encontradas: number;
      /** Ya estaban como prospecto, o son el mismo negocio que uno que ya está. */
      repetidas: number;
      /** Nuevas que no cupieron en esta búsqueda. */
      quedan: number;
    }
  | { ok: false; error: ErrorOsm };

const defecto = { buscarLugares, huellasDeProspectos, buscarEnOsm };

/** Con teléfono primero: la llamada es el canal principal de Prospección. */
function prioridad(p: ProspectoNuevo): number {
  if (p.phone) return 0;
  return p.website || p.email ? 1 : 2;
}

/**
 * Negocios de una categoría en un municipio (o provincia). Primero en los
 * lugares de Overture importados en `prospect_lugares`; si la tabla no existe
 * o no tiene nada para esa búsqueda, en OpenStreetMap como siempre. En los dos
 * casos se quitan los que ya son prospectos y los que son el mismo negocio que
 * uno ya guardado de la otra fuente.
 */
export async function buscarNegocios(
  q: { categoria: string; ciudad: string },
  d: typeof defecto = defecto,
): Promise<ResultadoBusqueda> {
  const categoria = categoriaPorClave(q.categoria);
  if (!categoria) return { ok: false, error: "categoria_desconocida" };
  const ciudad = q.ciudad.trim();

  let lugares = await d.buscarLugares({ clave: categoria.clave, municipio: claveTexto(ciudad) });
  if (lugares && lugares.length === 0) {
    const provincia = provinciaDeTexto(ciudad);
    if (provincia) lugares = await d.buscarLugares({ clave: categoria.clave, provincia });
  }

  let fuente: "overture" | "osm";
  let encontrados: ProspectoNuevo[];
  if (lugares && lugares.length > 0) {
    fuente = "overture";
    encontrados = lugares.map((l) => lugarAProspecto(l, categoria.texto, ciudad));
  } else {
    const r = await d.buscarEnOsm({ categoria: categoria.clave, ciudad });
    if (!r.ok) return { ok: false, error: r.error };
    fuente = "osm";
    encontrados = r.prospectos;
  }

  const huellas = await d.huellasDeProspectos();
  if (!huellas) console.error("[prospeccion] sin huellas de prospectos: no se quitan duplicados");
  const nuevos = huellas
    ? quitarDuplicados(
        encontrados.filter((p) => !huellas.ids.has(`${p.source}:${p.external_id}`)),
        huellas.fichas,
      )
    : encontrados;
  // `sort` es estable: dentro de cada grupo se conserva el orden de la fuente.
  const ordenados = [...nuevos].sort((a, b) => prioridad(a) - prioridad(b));

  return {
    ok: true,
    fuente,
    prospectos: ordenados.slice(0, MAX_POR_BUSQUEDA),
    encontradas: encontrados.length,
    repetidas: encontrados.length - nuevos.length,
    quedan: Math.max(0, ordenados.length - MAX_POR_BUSQUEDA),
  };
}

export type ResultadoEmpresasNuevas =
  | { ok: true; prospectos: ProspectoNuevo[]; encontradas: number; repetidas: number; quedan: number }
  /** `sin_datos`: la tabla `prospect_borme` no existe o no se pudo leer. */
  | { ok: false; error: "sin_datos" };

const defectoBorme = { buscarConstituciones, huellasDeProspectos };

/**
 * Empresas constituidas en los últimos `dias` días en un municipio (o, si no
 * hay ninguna y lo escrito es una provincia, en la provincia), de las
 * importadas del BORME en `prospect_borme`. Se quitan las que ya son
 * prospecto; las más recientes, primero.
 */
export async function buscarEmpresasNuevas(
  q: { lugar: string; dias: number; objeto: string },
  d: typeof defectoBorme = defectoBorme,
  hoy: Date = new Date(),
): Promise<ResultadoEmpresasNuevas> {
  const desde = new Date(hoy.getTime() - q.dias * 86_400_000).toISOString().slice(0, 10);
  let filas = await d.buscarConstituciones({ municipio: claveTexto(q.lugar), desde, objeto: q.objeto });
  if (filas && filas.length === 0) {
    const provincia = provinciaDeTexto(q.lugar);
    if (provincia) filas = await d.buscarConstituciones({ provincia, desde, objeto: q.objeto });
  }
  if (!filas) return { ok: false, error: "sin_datos" };

  const encontrados = filas.map(constitucionAProspecto);
  const huellas = await d.huellasDeProspectos();
  if (!huellas) console.error("[prospeccion] sin huellas de prospectos: no se quitan duplicados");
  const nuevos = huellas ? encontrados.filter((p) => !huellas.ids.has(`borme:${p.external_id}`)) : encontrados;
  return {
    ok: true,
    prospectos: nuevos.slice(0, MAX_POR_BUSQUEDA),
    encontradas: encontrados.length,
    repetidas: encontrados.length - nuevos.length,
    quedan: Math.max(0, nuevos.length - MAX_POR_BUSQUEDA),
  };
}
