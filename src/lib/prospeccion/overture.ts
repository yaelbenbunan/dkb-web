/**
 * Negocios de Overture Maps Places (https://docs.overturemaps.org/guides/places/).
 *
 * Overture publica sus datos como GeoParquet en S3, sin API: un script local
 * (`scripts/prospeccion/importar-overture.ts`) los lee con DuckDB y los sube a
 * `prospect_lugares`, y la búsqueda del panel lee esa tabla. Aquí está lo puro
 * de ese camino: la consulta, qué categorías tiene un lugar, la fila de la tabla
 * y el prospecto que sale de ella.
 *
 * Licencia (comprobada el 2026-10-16 en https://docs.overturemaps.org/attribution/):
 * CDLA Permissive 2.0 casi todo; Foursquare con Apache 2.0 y AllThePlaces con
 * CC0 1.0. Permite guardar y reutilizar citando la fuente.
 *
 * Desde el release de septiembre de 2026 (esquema v2) no existe `categories`:
 * se clasifica con `taxonomy` (`primary`, `hierarchy`, `alternates`).
 *
 * Sin `server-only` y con imports relativos con extensión: el script lo carga
 * con Node sin compilar.
 */
import { CATEGORIAS } from "./categorias.ts";
import { claveTexto, normalizarTelefono, webPropia } from "./contacto.ts";
import { provinciaDeCp } from "./provincias.ts";
import type { ProspectoNuevo } from "./tipos.ts";

export const ATRIBUCION_OVERTURE = {
  texto: "Overture Maps Foundation",
  url: "https://overturemaps.org",
  /** Página con la línea de cada fuente y su licencia. */
  urlAtribucion: "https://docs.overturemaps.org/attribution/",
  fuentes: "Meta, Microsoft, Foursquare, AllThePlaces y otros",
  licencias: "CDLA Permissive 2.0, Apache 2.0 (Foursquare) y CC0 1.0",
} as const;

/** Lo que devuelve {@link consultaOverture}, una fila por lugar. */
export interface LugarBruto {
  id: string;
  nombre: string | null;
  primaria: string | null;
  jerarquia: string[] | null;
  alternativas: string[] | null;
  telefonos: string[] | null;
  webs: string[] | null;
  emails: string[] | null;
  redes: string[] | null;
  direccion: string | null;
  municipio: string | null;
  cp: string | null;
  pais: string | null;
  lat: number | null;
  lon: number | null;
  confianza: number | null;
  estado: string | null;
  fuentes: string[] | null;
  licencias: string[] | null;
}

/** Fila de `prospect_lugares` (ver `docs/sql/2026-10-16-prospeccion-overture.sql`). */
export interface FilaLugar {
  id: string;
  nombre: string;
  categorias: string[];
  categoria_overture: string | null;
  direccion: string | null;
  municipio: string | null;
  municipio_clave: string | null;
  provincia: string | null;
  cp: string | null;
  lat: number | null;
  lon: number | null;
  telefono: string | null;
  telefono_clave: string | null;
  web: string | null;
  email: string | null;
  redes: string[];
  fuentes: string[];
  licencias: string[];
  confianza: number;
  release: string;
}

export function nodosOverture(): string[] {
  return [...new Set(CATEGORIAS.flatMap((c) => c.overture.nodos))];
}

function exactasOverture(): string[] {
  return [...new Set(CATEGORIAS.flatMap((c) => c.overture.exactas ?? []))];
}

/** Claves de `categorias.ts` en las que entra un lugar, en el orden de la lista. */
export function categoriasDeLugar(t: Pick<LugarBruto, "primaria" | "jerarquia" | "alternativas">): string[] {
  const nodos = new Set([...(t.jerarquia ?? []), ...(t.alternativas ?? [])]);
  return CATEGORIAS.filter(
    (c) => c.overture.nodos.some((n) => nodos.has(n)) || (!!t.primaria && (c.overture.exactas ?? []).includes(t.primaria)),
  ).map((c) => c.clave);
}

const texto = (v: string | null | undefined): string | null => {
  const limpio = (v ?? "").replace(/\s+/g, " ").trim();
  return limpio || null;
};
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const unicos = (lista: Array<string | null>) => [...new Set(lista.filter((x): x is string => !!x))];

/** La fila de `prospect_lugares`, o null si el lugar no sirve: cerrado, sin
 *  nombre, fuera de España, por debajo de la confianza pedida o de ninguna
 *  categoría de Prospección. */
export function transformarLugar(
  b: LugarBruto,
  o: { release: string; confianzaMinima: number },
): FilaLugar | null {
  const nombre = texto(b.nombre);
  if (!nombre || !b.id) return null;
  if (b.estado === "permanently_closed") return null;
  if (b.pais !== "ES") return null;
  if (typeof b.confianza !== "number" || b.confianza < o.confianzaMinima) return null;
  const categorias = categoriasDeLugar(b);
  if (categorias.length === 0) return null;

  const webs = (b.webs ?? []).map((w) => texto(w)).filter((w): w is string => !!w);
  const web = webs.map(webPropia).find(Boolean) ?? null;
  // Una «web» que es un perfil de red social va con las redes.
  const redes = unicos([...(b.redes ?? []).map(texto), ...webs.filter((w) => !webPropia(w))]);
  const telefono = (b.telefonos ?? []).map(texto).find(Boolean) ?? null;
  const email = (b.emails ?? []).map(texto).find((e) => !!e && RE_EMAIL.test(e)) ?? null;
  const municipio = texto(b.municipio);
  const cp = texto(b.cp);

  return {
    id: b.id,
    nombre,
    categorias,
    categoria_overture: b.primaria ?? null,
    direccion: texto(b.direccion),
    municipio,
    municipio_clave: municipio ? claveTexto(municipio) : null,
    provincia: provinciaDeCp(cp),
    cp,
    lat: b.lat ?? null,
    lon: b.lon ?? null,
    telefono,
    telefono_clave: normalizarTelefono(telefono),
    web,
    email,
    redes,
    // «Overture» como dataset es su propio cálculo de confianza, no una fuente.
    fuentes: unicos((b.fuentes ?? []).filter((f) => f !== "Overture")),
    licencias: unicos(b.licencias ?? []),
    confianza: Math.round(b.confianza * 10000) / 10000,
    release: o.release,
  };
}

/** El prospecto que se guarda al encontrar un lugar en una búsqueda. */
export function lugarAProspecto(f: FilaLugar, sector: string, ciudadBuscada: string): ProspectoNuevo {
  const poblacion = [f.cp, f.municipio].filter(Boolean).join(" ");
  return {
    source: "overture",
    external_id: f.id,
    name: f.nombre,
    sector,
    address: f.direccion ? [f.direccion, poblacion].filter(Boolean).join(", ") : null,
    city: f.municipio ?? (ciudadBuscada.trim() || null),
    province: f.provincia,
    phone: f.telefono,
    website: f.web,
    email: f.email,
    rating: null,
    reviews: null,
  };
}

const lista = (valores: string[]) => valores.map((v) => `'${v.replace(/'/g, "''")}'`).join(", ");

/**
 * Consulta de DuckDB (con `httpfs`) que lee los lugares de España de las
 * categorías de Prospección. La caja de coordenadas (Península, Baleares, Ceuta,
 * Melilla y Canarias) deja a DuckDB saltarse los ficheros del resto del mundo;
 * el país de la dirección quita lo que cae dentro de la caja sin ser España
 * (Portugal, Andorra, sur de Francia, norte de Marruecos). El filtro fino de
 * categorías, confianza y cierre se repite en {@link transformarLugar}.
 */
export function consultaOverture(o: { release: string; confianzaMinima: number; cpPrefijo?: string }): string {
  if (!/^\d{4}-\d{2}-\d{2}\.\d+$/.test(o.release)) throw new Error(`Release no válido: ${o.release}`);
  if (!Number.isFinite(o.confianzaMinima) || o.confianzaMinima < 0 || o.confianzaMinima > 1) {
    throw new Error(`Confianza no válida: ${o.confianzaMinima}`);
  }
  if (o.cpPrefijo !== undefined && !/^\d{2}$/.test(o.cpPrefijo)) throw new Error(`Provincia no válida: ${o.cpPrefijo}`);
  const nodos = lista(nodosOverture());
  const exactas = lista(exactasOverture());
  return `
SELECT
  id,
  names.primary AS nombre,
  taxonomy.primary AS primaria,
  taxonomy.hierarchy AS jerarquia,
  taxonomy.alternates AS alternativas,
  phones AS telefonos,
  websites AS webs,
  emails,
  socials AS redes,
  addresses[1].freeform AS direccion,
  addresses[1].locality AS municipio,
  addresses[1].postcode AS cp,
  addresses[1].country AS pais,
  bbox.ymin AS lat,
  bbox.xmin AS lon,
  confidence AS confianza,
  operating_status AS estado,
  list_transform(sources, s -> s.dataset) AS fuentes,
  list_transform(sources, s -> s.license) AS licencias
FROM read_parquet('s3://overturemaps-us-west-2/release/${o.release}/theme=places/type=place/*')
WHERE (
    (bbox.xmin BETWEEN -9.6 AND 4.6 AND bbox.ymin BETWEEN 35.1 AND 44.0)
    OR (bbox.xmin BETWEEN -18.3 AND -13.3 AND bbox.ymin BETWEEN 27.5 AND 29.5)
  )
  AND addresses[1].country = 'ES'
  AND confidence >= ${o.confianzaMinima}
  AND operating_status IS DISTINCT FROM 'permanently_closed'
  AND names.primary IS NOT NULL
  AND (
    list_has_any(taxonomy.hierarchy, [${nodos}])
    OR list_has_any(taxonomy.alternates, [${nodos}])
    OR taxonomy.primary IN (${exactas})
  )${o.cpPrefijo ? `\n  AND addresses[1].postcode LIKE '${o.cpPrefijo}%'` : ""}
`;
}
