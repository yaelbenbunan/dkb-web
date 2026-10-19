/**
 * Empresas recién constituidas, del BORME (sección A, «Actos inscritos»).
 *
 * El BOE publica cada día un sumario en su API de datos abiertos
 * (https://www.boe.es/datosabiertos/api/borme/sumario/{aaaammdd}) con un
 * documento por provincia; cada documento tiene una versión XML con los actos
 * inscritos. Aquí está lo puro de ese camino: qué documentos leer, cómo sacar
 * de cada uno las constituciones y el prospecto que sale de cada una. El script
 * `scripts/prospeccion/importar-borme.ts` las sube a `prospect_borme`.
 *
 * Reutilización (comprobada el 2026-10-19 en
 * https://www.boe.es/informacion/aviso_legal/index.php#reutilizacion): se
 * permite con fines comerciales citando la fuente y sin sugerir carácter
 * oficial. El BORME trae nombres de administradores y socios únicos: son datos
 * personales que no hacen falta para escribir a la sociedad, así que aquí se
 * descartan y no se guardan nunca. Ver
 * docs/superpowers/specs/2026-10-19-prospeccion-borme-design.md.
 *
 * Sin `server-only` y con imports relativos con extensión: el script lo carga
 * con Node sin compilar.
 */
import { claveTexto, webPropia } from "./contacto.ts";
import { provinciaDeTexto } from "./provincias.ts";
import type { ProspectoNuevo } from "./tipos.ts";

export const ATRIBUCION_BORME = {
  texto: "Basado en datos de la Agencia Estatal Boletín Oficial del Estado (BORME)",
  url: "https://www.boe.es",
} as const;

/** Un documento de la sección A del sumario: los actos de una provincia. */
export interface DocumentoBorme {
  bormeId: string;
  provincia: string;
  urlXml: string;
  urlPdf: string | null;
}

/** Fila de `prospect_borme` (ver `docs/sql/2026-10-19-prospeccion-borme.sql`).
 *  Solo datos de la sociedad: ninguna columna de personas. */
export interface FilaBorme {
  /** `{año}-{número de anuncio}`: el número es correlativo en todo el BORME del año. */
  id: string;
  nombre: string;
  fecha_publicacion: string;
  inicio_operaciones: string | null;
  objeto: string | null;
  domicilio: string | null;
  municipio: string | null;
  municipio_clave: string | null;
  provincia: string;
  capital: number | null;
  /** La web que la sociedad declara en el acto, si la declara. */
  web: string | null;
  borme_id: string;
  url_pdf: string | null;
}

const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const comoLista = (v: unknown): unknown[] => (Array.isArray(v) ? v : v == null ? [] : [v]);
const deBoe = (url: unknown): url is string => typeof url === "string" && /^https:\/\/www\.boe\.es\//.test(url);

/** La provincia de un título del sumario («ALICANTE/ALACANT», «A CORUÑA»…). */
export function provinciaBorme(titulo: string): string | null {
  return provinciaDeTexto(titulo) ?? titulo.split("/").map((t) => provinciaDeTexto(t)).find(Boolean) ?? null;
}

/** Los documentos de la sección A de un sumario del BORME (JSON de la API). El
 *  índice alfabético no es una provincia y se salta. Solo URLs de boe.es: lo
 *  que venga de fuera no se descarga. */
export function documentosSeccionA(sumario: unknown): DocumentoBorme[] {
  const datos = esObjeto(sumario) && esObjeto(sumario.data) ? sumario.data.sumario : null;
  if (!esObjeto(datos)) return [];
  const docs: DocumentoBorme[] = [];
  for (const diario of comoLista(datos.diario)) {
    if (!esObjeto(diario)) continue;
    for (const seccion of comoLista(diario.seccion)) {
      if (!esObjeto(seccion) || seccion.codigo !== "A") continue;
      for (const item of comoLista(seccion.item)) {
        if (!esObjeto(item) || typeof item.identificador !== "string" || typeof item.titulo !== "string") continue;
        const provincia = provinciaBorme(item.titulo);
        if (!provincia || !deBoe(item.url_xml)) continue;
        const pdf = esObjeto(item.url_pdf) ? item.url_pdf.texto : null;
        docs.push({ bormeId: item.identificador, provincia, urlXml: item.url_xml, urlPdf: deBoe(pdf) ? pdf : null });
      }
    }
  }
  return docs;
}

/** «4.09.26» → «2026-09-04»; null si no es una fecha válida. */
export function fechaBorme(texto: string): string | null {
  const m = /^(\d{1,2})\.(\d{2})\.(\d{2})$/.exec(texto.trim());
  if (!m) return null;
  const [d, mes, a] = [Number(m[1]), Number(m[2]), 2000 + Number(m[3])];
  const f = new Date(Date.UTC(a, mes - 1, d));
  if (f.getUTCMonth() !== mes - 1 || f.getUTCDate() !== d) return null;
  return f.toISOString().slice(0, 10);
}

const ENTIDADES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function textoPlano(xml: string): string {
  return xml
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (todo, e: string) => {
      if (e[0] === "#") return String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1)));
      return ENTIDADES[e.toLowerCase()] ?? todo;
    })
    .replace(/\s+/g, " ")
    .trim();
}

const MINUSCULAS = new Set(["de", "del", "la", "las", "los", "el", "y", "i", "e", "d", "l"]);

/** «SAN SEBASTIAN DE LOS REYES» → «San Sebastian de los Reyes». */
function nombrePropio(texto: string): string {
  return texto
    .toLowerCase()
    .split(" ")
    .map((palabra, i) =>
      i > 0 && MINUSCULAS.has(palabra) ? palabra : palabra.replace(/(^|['’\-/(])(\p{L})/gu, (_, sep: string, l: string) => sep + l.toUpperCase()),
    )
    .join(" ");
}

/** «Domicilio: C/ X 35 (ALFAS DEL PI (L')). Capital…» → calle y municipio. El
 *  municipio es el último paréntesis de primer nivel y puede llevar otros
 *  dentro, así que se cuentan; el domicilio acaba en el «).» que cierra ese
 *  nivel. Si no cuadra, null: mejor sin domicilio que con el texto que sigue
 *  (que trae nombres de personas). */
function domicilio(texto: string): { calle: string; municipio: string } | null {
  const inicio = texto.indexOf("Domicilio: ");
  if (inicio < 0) return null;
  let nivel = 0;
  let abre = -1;
  for (let i = inicio + "Domicilio: ".length; i < texto.length && i < inicio + 300; i++) {
    const c = texto[i];
    if (c === "(") {
      if (nivel === 0) abre = i;
      nivel++;
    } else if (c === ")" && nivel > 0) {
      nivel--;
      if (nivel === 0 && texto[i + 1] === ".") {
        const calle = texto.slice(inicio + "Domicilio: ".length, abre).trim();
        const municipio = texto.slice(abre + 1, i).trim();
        return calle && municipio ? { calle, municipio } : null;
      }
    }
  }
  return domicilioDescuadrado(texto.slice(inicio + "Domicilio: ".length));
}

/** El BORME trae a veces los paréntesis descuadrados («(HOSPITALET DE
 *  LLOBREGAT (L'.», «FLORIDA ( (JEREZ…)»). Entonces el domicilio acaba en el
 *  siguiente apartado conocido y el municipio es lo que va desde el primer
 *  paréntesis, limpio de paréntesis sueltos. */
function domicilioDescuadrado(resto: string): { calle: string; municipio: string } | null {
  const fin = /\.\s(?=Capital|Declaración|Nombramientos|Datos registrales|Página web)/.exec(resto);
  if (!fin || fin.index > 300) return null;
  const tramo = resto.slice(0, fin.index);
  const abre = tramo.indexOf("(");
  if (abre < 0) return null;
  const calle = tramo.slice(0, abre).trim();
  let municipio = tramo.slice(abre).replace(/^[(\s]+/, "").replace(/\)+$/, "").trim();
  const abiertos = (municipio.match(/\(/g) ?? []).length - (municipio.match(/\)/g) ?? []).length;
  if (abiertos > 0) municipio += ")".repeat(abiertos);
  return calle && municipio ? { calle, municipio } : null;
}

/** «ROZAS DE MADRID (LAS)» → «LAS ROZAS DE MADRID»; «ALFAS DEL PI (L')» →
 *  «L'ALFAS DEL PI». Así se escribe y se busca. */
function articuloDelante(municipio: string): string {
  const m = /^(.+?)\s*\((L'|EL|LA|LOS|LAS|ELS|LES|SA|ES|SES|O|A|OS|AS)\)$/i.exec(municipio);
  if (!m) return municipio;
  return m[2].endsWith("'") ? `${m[2]}${m[1]}` : `${m[2]} ${m[1]}`;
}

function importe(texto: string): number | null {
  const n = Number(texto.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/**
 * Las constituciones de un documento XML de la sección A. Cada acto viene como
 * `<p class="articulo">número - DENOMINACIÓN.</p><p class="parrafo">texto</p>`;
 * se quedan los que empiezan por «Constitución.». Del texto se leen el objeto
 * social, el domicilio, el capital, el comienzo de operaciones y la web; los
 * nombramientos y el socio único (personas) no se leen.
 */
export function parsearConstituciones(
  xml: string,
  doc: { bormeId: string; provincia: string; fecha: string; urlPdf: string | null },
): FilaBorme[] {
  const año = doc.fecha.slice(0, 4);
  const filas: FilaBorme[] = [];
  const re = /<p class="articulo">([\s\S]*?)<\/p>\s*<p class="parrafo">([\s\S]*?)<\/p>/g;
  for (const [, cabecera, cuerpo] of xml.matchAll(re)) {
    const texto = textoPlano(cuerpo);
    if (!texto.startsWith("Constitución.")) continue;
    const m = /^(\d+)\s*-\s*(.+?)\.?$/.exec(textoPlano(cabecera));
    if (!m) continue;
    // «… SOCIEDAD LIMITADA(R.M. MAHON)»: el registro no es parte del nombre.
    const nombre = m[2].replace(/\s*\(R\.M\.[^)]*\)$/, "").replace(/\.$/, "").trim();

    const dom = domicilio(texto);
    const municipio = dom ? nombrePropio(articuloDelante(dom.municipio)) : null;
    const objeto = /Objeto social: (.*?) Domicilio:/.exec(texto)?.[1].trim() ?? null;
    const capital = /Capital(?: suscrito)?: ([\d.]+,\d+) Euros/.exec(texto);
    const inicio = /Comienzo de operaciones: (\d{1,2}\.\d{2}\.\d{2})\./.exec(texto);
    const web = /página web corporativa: (\S+?)\.?(?: |$)/.exec(texto);

    filas.push({
      id: `${año}-${m[1]}`,
      nombre,
      fecha_publicacion: doc.fecha,
      inicio_operaciones: inicio ? fechaBorme(inicio[1]) : null,
      objeto: objeto || null,
      domicilio: dom?.calle ?? null,
      municipio,
      municipio_clave: municipio ? claveTexto(municipio) : null,
      provincia: doc.provincia,
      capital: capital ? importe(capital[1]) : null,
      web: web ? webPropia(web[1]) : null,
      borme_id: doc.bormeId,
      url_pdf: doc.urlPdf,
    });
  }
  return filas;
}

const MAX_SECTOR = 160;

/** El prospecto que se guarda al encontrar una empresa nueva. Sin teléfono ni
 *  email: se le escribe por carta al domicilio social. */
export function constitucionAProspecto(f: FilaBorme): ProspectoNuevo {
  const [a, m, d] = f.fecha_publicacion.split("-");
  let sector = `BORME ${d}/${m}/${a}${f.objeto ? ` · ${f.objeto}` : ""}`;
  if (sector.length > MAX_SECTOR) sector = `${sector.slice(0, MAX_SECTOR - 1).trimEnd()}…`;
  return {
    source: "borme",
    external_id: f.id,
    name: f.nombre,
    sector,
    address: [f.domicilio, f.municipio].filter(Boolean).join(", ") || null,
    city: f.municipio,
    province: f.provincia,
    phone: null,
    website: f.web,
    email: null,
    rating: null,
    reviews: null,
  };
}
