import "server-only";
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
