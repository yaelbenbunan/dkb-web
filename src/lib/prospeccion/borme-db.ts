import "server-only";
import { getSupabaseAdmin } from "../supabase-admin";
import type { FilaBorme } from "./borme";

const TABLA = "prospect_borme";
/** PostgREST no devuelve más de 1000 filas por consulta. */
const PAGINA = 1000;

/**
 * Patrón `ilike` para una palabra del objeto social. El BORME escribe con y
 * sin tildes («estetica», «estética»), así que cada vocal pasa a `_` (un
 * carácter cualquiera). Lo que no es letra, número o espacio se quita: el
 * usuario no mete comodines. null si no queda nada.
 */
export function patronObjeto(texto: string): string | null {
  const limpio = texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñç ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
  if (!limpio) return null;
  return `%${limpio.replace(/[aeiou]/g, "_")}%`;
}

/**
 * Constituciones publicadas desde una fecha en un municipio (por su clave sin
 * tildes) o en una provincia, las más recientes primero, filtradas si se pide
 * por una palabra del objeto social. null si no se pudo leer (la tabla no
 * existe todavía o la consulta falló).
 */
export async function buscarConstituciones(q: {
  municipio?: string;
  provincia?: string;
  desde: string;
  objeto?: string;
}): Promise<FilaBorme[] | null> {
  if (!q.municipio && !q.provincia) return [];
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  let consulta = sb.from(TABLA).select("*");
  consulta = q.municipio ? consulta.eq("municipio_clave", q.municipio) : consulta.eq("provincia", q.provincia as string);
  consulta = consulta.gte("fecha_publicacion", q.desde);
  const patron = q.objeto ? patronObjeto(q.objeto) : null;
  if (patron) consulta = consulta.ilike("objeto", patron);
  const { data, error } = await consulta
    .order("fecha_publicacion", { ascending: false })
    .order("id")
    .limit(PAGINA);
  if (error) {
    console.error(`[prospeccion] buscarConstituciones: ${error.message}`);
    return null;
  }
  return (data ?? []) as FilaBorme[];
}
