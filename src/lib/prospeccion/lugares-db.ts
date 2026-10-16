import "server-only";
import { getSupabaseAdmin } from "../supabase-admin";
import type { FichaComparable } from "./contacto";
import type { FilaLugar } from "./overture";

const LUGARES = "prospect_lugares";
const PROSPECTOS = "prospects";
/** PostgREST no devuelve más de 1000 filas por consulta. */
const PAGINA = 1000;

/**
 * Lugares de Overture de una categoría en un municipio (por su clave sin
 * tildes) o en una provincia, los de más confianza primero. null si no se pudo
 * leer: la tabla no existe todavía (migración sin ejecutar) o la consulta
 * falló. Quien llama vuelve entonces a OpenStreetMap.
 */
export async function buscarLugares(
  q: { clave: string; municipio?: string; provincia?: string },
): Promise<FilaLugar[] | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  let consulta = sb.from(LUGARES).select("*").contains("categorias", [q.clave]);
  if (q.municipio) consulta = consulta.eq("municipio_clave", q.municipio);
  else if (q.provincia) consulta = consulta.eq("provincia", q.provincia);
  else return [];
  const { data, error } = await consulta
    .order("confianza", { ascending: false })
    .order("id")
    .limit(PAGINA);
  if (error) {
    console.error(`[prospeccion] buscarLugares: ${error.message}`);
    return null;
  }
  return (data ?? []) as FilaLugar[];
}

/**
 * Lo necesario para no repetir negocios: `fuente:id` de cada prospecto y su
 * municipio, teléfono y web. Se lee entero, de 1000 en 1000 (son unos pocos
 * miles de filas). null si falla.
 */
export async function huellasDeProspectos(): Promise<{ ids: Set<string>; fichas: FichaComparable[] } | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const ids = new Set<string>();
  const fichas: FichaComparable[] = [];
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await sb
      .from(PROSPECTOS)
      .select("source, external_id, city, phone, website")
      .order("id")
      .range(desde, desde + PAGINA - 1);
    if (error) {
      console.error(`[prospeccion] huellasDeProspectos: ${error.message}`);
      return null;
    }
    const filas = (data ?? []) as Array<FichaComparable & { source: string; external_id: string }>;
    if (filas.length === 0) return { ids, fichas };
    for (const f of filas) {
      ids.add(`${f.source}:${f.external_id}`);
      fichas.push({ city: f.city, phone: f.phone, website: f.website });
    }
  }
}
