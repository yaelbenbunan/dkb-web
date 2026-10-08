import "server-only";
import { categoriaPorClave } from "./categorias";
import type { ProspectoNuevo } from "./tipos";

/**
 * Negocios de un municipio sacados de OpenStreetMap.
 *
 * OSM y no Google Places a propósito: las condiciones de Google Maps Platform
 * prohíben copiar y guardar nombres y direcciones de negocios, y eso es justo
 * lo que hace esta pestaña. Los datos de OSM son abiertos (licencia ODbL): se
 * pueden guardar y usar, citando la fuente.
 *
 * Dos pasos: Nominatim localiza el municipio y Overpass devuelve los negocios
 * de su área. Ambos son servicios gratuitos de uso moderado; piden
 * identificarse con un User-Agent.
 */
const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const OVERPASS = "https://overpass-api.de/api/interpreter";
const AGENTE = "dinkbit-crm/1.0 (hola@dinkbit.es)";
const MAX_RESULTADOS = 120;
/** Overpass devuelve bastantes más de los que se guardan: así, tras ordenar,
 *  los que tienen forma de contacto no se quedan fuera por el corte. */
const MAX_LEIDOS = 600;

/** Un perfil en una red social no es una web: ni se puede leer para buscar el
 *  email, ni quita que al negocio le haga falta una. */
const REDES = ["facebook.com", "instagram.com", "linktr.ee", "wa.me", "tiktok.com", "twitter.com", "x.com"];

function texto(v: unknown): string | null {
  if (typeof v !== "string") return null;
  // Las etiquetas de OSM las escribe gente: llegan con espacios dobles.
  const limpio = v.replace(/\s+/g, " ").trim();
  return limpio || null;
}

function webPropia(bruta: string | null): string | null {
  if (!bruta) return null;
  const conEsquema = /^[a-z][a-z0-9+.-]*:/i.test(bruta) ? bruta : `https://${bruta}`;
  try {
    const url = new URL(conEsquema);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    if (!host.includes(".")) return null;
    if (REDES.some((r) => host === r || host.endsWith(`.${r}`))) return null;
    return conEsquema;
  } catch {
    return null;
  }
}

export function normalizarElemento(
  bruto: unknown,
  sector: string,
  ciudadBuscada: string,
): ProspectoNuevo | null {
  if (!bruto || typeof bruto !== "object") return null;
  const el = bruto as { type?: unknown; id?: unknown; tags?: Record<string, unknown> };
  const tags = el.tags ?? {};
  const nombre = texto(tags.name);
  if (!nombre || typeof el.type !== "string" || typeof el.id !== "number") return null;

  const calle = [texto(tags["addr:street"]), texto(tags["addr:housenumber"])].filter(Boolean).join(" ");
  const ciudad = texto(tags["addr:city"]) ?? texto(ciudadBuscada);
  const poblacion = [texto(tags["addr:postcode"]), texto(tags["addr:city"])].filter(Boolean).join(" ");
  const direccion = calle ? [calle, poblacion].filter(Boolean).join(", ") : null;

  return {
    source: "osm",
    external_id: `${el.type}/${el.id}`,
    name: nombre,
    sector,
    address: direccion,
    city: ciudad,
    province: texto(tags["addr:province"]),
    phone: texto(tags.phone) ?? texto(tags["contact:phone"]),
    website: webPropia(texto(tags.website) ?? texto(tags["contact:website"]) ?? texto(tags.url)),
    email: texto(tags.email) ?? texto(tags["contact:email"]),
    rating: null,
    reviews: null,
  };
}

/** Cuánto se puede hacer con una ficha: con web o email se le puede escribir;
 *  con teléfono, al menos llamar. */
function utilidad(p: ProspectoNuevo): number {
  if (p.website || p.email) return 0;
  return p.phone ? 1 : 2;
}

export type ErrorOsm = "categoria_desconocida" | "ciudad_no_encontrada" | "error_api";

/** Busca negocios de una categoría en un municipio español. Si falla cualquiera
 *  de las dos consultas se devuelve el error y ningún resultado: una búsqueda a
 *  medias parecería completa en el panel. */
export async function buscarEnOsm(
  q: { categoria: string; ciudad: string },
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true; prospectos: ProspectoNuevo[] } | { ok: false; error: ErrorOsm; detalle?: string }> {
  const categoria = categoriaPorClave(q.categoria);
  if (!categoria) return { ok: false, error: "categoria_desconocida" };
  const ciudad = q.ciudad.trim();

  try {
    const params = new URLSearchParams({ city: ciudad, countrycodes: "es", format: "jsonv2", limit: "5" });
    const resCiudad = await fetchImpl(`${NOMINATIM}?${params}`, {
      headers: { "User-Agent": AGENTE, "Accept-Language": "es" },
      signal: AbortSignal.timeout(15000),
    });
    if (!resCiudad.ok) return { ok: false, error: "error_api", detalle: `Nominatim ${resCiudad.status}` };
    const lugares = (await resCiudad.json()) as Array<{ osm_type?: string; osm_id?: number }>;
    // Solo una relación tiene área: es el límite del municipio.
    const municipio = (Array.isArray(lugares) ? lugares : []).find(
      (l) => l.osm_type === "relation" && typeof l.osm_id === "number",
    );
    if (!municipio) return { ok: false, error: "ciudad_no_encontrada" };

    // El área de una relación es su id + 3600000000 (convención de Overpass).
    const area = 3_600_000_000 + (municipio.osm_id as number);
    const consulta =
      `[out:json][timeout:25];area(${area})->.a;(` +
      categoria.filtros.map((f) => `nwr${f}["name"](area.a);`).join("") +
      `);out center tags ${MAX_LEIDOS};`;
    const resNegocios = await fetchImpl(OVERPASS, {
      method: "POST",
      headers: { "User-Agent": AGENTE, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ data: consulta }).toString(),
      signal: AbortSignal.timeout(30000),
    });
    if (!resNegocios.ok) return { ok: false, error: "error_api", detalle: `Overpass ${resNegocios.status}` };
    const datos = (await resNegocios.json()) as { elements?: unknown[] };

    const vistos = new Set<string>();
    const prospectos: ProspectoNuevo[] = [];
    for (const bruto of datos.elements ?? []) {
      const p = normalizarElemento(bruto, categoria.texto, ciudad);
      if (p && !vistos.has(p.external_id)) {
        vistos.add(p.external_id);
        prospectos.push(p);
      }
    }
    // `sort` es estable: dentro de cada grupo se conserva el orden de llegada.
    prospectos.sort((a, b) => utilidad(a) - utilidad(b));
    return { ok: true, prospectos: prospectos.slice(0, MAX_RESULTADOS) };
  } catch (err) {
    return { ok: false, error: "error_api", detalle: err instanceof Error ? err.message : String(err) };
  }
}
