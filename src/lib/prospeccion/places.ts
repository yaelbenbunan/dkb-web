import "server-only";
import type { ProspectoNuevo } from "./tipos";

const URL_BUSQUEDA = "https://places.googleapis.com/v1/places:searchText";
const MAX_PAGINAS = 3;
const POR_PAGINA = 20;
/** Sin límite, una llamada colgada dejaría la acción esperando hasta que la corte la plataforma. */
const ESPERA_MS = 10000;

/** Solo los campos que se guardan: Places cobra según lo que se pide. */
const CAMPOS = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.addressComponents",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.primaryTypeDisplayName",
  "places.rating",
  "places.userRatingCount",
  "nextPageToken",
].join(",");

/** Un perfil en una red social no es una web: ni se puede leer para buscar el
 *  email, ni quita que al negocio le haga falta una. */
const REDES = ["facebook.com", "instagram.com", "linktr.ee", "wa.me", "tiktok.com", "twitter.com", "x.com"];

function webPropia(bruta: unknown): string | null {
  if (typeof bruta !== "string" || !bruta.trim()) return null;
  try {
    const host = new URL(bruta).hostname.toLowerCase();
    if (REDES.some((r) => host === r || host.endsWith(`.${r}`))) return null;
    return bruta.trim();
  } catch {
    return null;
  }
}

function texto(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function componente(lugar: Record<string, unknown>, tipo: string): string | null {
  const lista = Array.isArray(lugar.addressComponents) ? lugar.addressComponents : [];
  for (const c of lista as Array<{ longText?: unknown; types?: unknown }>) {
    if (Array.isArray(c.types) && c.types.includes(tipo)) return texto(c.longText);
  }
  return null;
}

export function normalizarLugar(bruto: unknown, ciudadBuscada: string): ProspectoNuevo | null {
  if (!bruto || typeof bruto !== "object") return null;
  const lugar = bruto as Record<string, unknown>;
  const id = texto(lugar.id);
  const nombre = texto((lugar.displayName as { text?: unknown } | undefined)?.text);
  if (!id || !nombre) return null;
  return {
    source: "places",
    external_id: id,
    name: nombre,
    sector: texto((lugar.primaryTypeDisplayName as { text?: unknown } | undefined)?.text),
    address: texto(lugar.formattedAddress),
    city: componente(lugar, "locality") ?? texto(ciudadBuscada),
    province: componente(lugar, "administrative_area_level_2"),
    phone: texto(lugar.nationalPhoneNumber),
    website: webPropia(lugar.websiteUri),
    rating: typeof lugar.rating === "number" ? lugar.rating : null,
    reviews: typeof lugar.userRatingCount === "number" ? lugar.userRatingCount : null,
  };
}

/** Busca negocios de una categoría en una ciudad. Si falla cualquier página se
 *  devuelve el error y ningún resultado: una búsqueda a medias parecería
 *  completa en el panel. */
export async function buscarEnPlaces(
  q: { categoria: string; ciudad: string },
  fetchImpl: typeof fetch = fetch,
): Promise<
  | { ok: true; prospectos: ProspectoNuevo[] }
  | { ok: false; error: "sin_clave" | "error_api"; detalle?: string }
> {
  const clave = process.env.GOOGLE_PLACES_API_KEY;
  if (!clave) return { ok: false, error: "sin_clave" };

  const base = {
    textQuery: `${q.categoria.trim()} en ${q.ciudad.trim()}`,
    languageCode: "es",
    regionCode: "ES",
    pageSize: POR_PAGINA,
  };
  const prospectos: ProspectoNuevo[] = [];
  const vistos = new Set<string>();
  let pageToken: string | undefined;

  try {
    for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
      const res = await fetchImpl(URL_BUSQUEDA, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": clave,
          "X-Goog-FieldMask": CAMPOS,
        },
        body: JSON.stringify(pageToken ? { ...base, pageToken } : base),
        signal: AbortSignal.timeout(ESPERA_MS),
      });
      if (!res.ok) {
        const cuerpo = await res.text().catch(() => "");
        return { ok: false, error: "error_api", detalle: `${res.status} ${cuerpo.slice(0, 200)}` };
      }
      const datos = (await res.json()) as { places?: unknown[]; nextPageToken?: string };
      for (const bruto of datos.places ?? []) {
        const p = normalizarLugar(bruto, q.ciudad);
        if (p && !vistos.has(p.external_id)) {
          vistos.add(p.external_id);
          prospectos.push(p);
        }
      }
      pageToken = datos.nextPageToken;
      if (!pageToken) break;
    }
  } catch (err) {
    return { ok: false, error: "error_api", detalle: err instanceof Error ? err.message : String(err) };
  }
  return { ok: true, prospectos };
}
