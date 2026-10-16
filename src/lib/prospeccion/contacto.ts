/**
 * Datos de contacto de un negocio, sean de la fuente que sean: qué web es suya,
 * cómo comparar teléfonos y webs, y qué fichas son el mismo negocio.
 *
 * Puro y con imports relativos: lo usan el panel, el servidor y el script de
 * importación de Overture (que Node ejecuta sin compilar).
 */

/** Un perfil en una red social no es una web: ni se puede leer para buscar el
 *  email, ni quita que al negocio le haga falta una. */
const REDES = ["facebook.com", "instagram.com", "linktr.ee", "wa.me", "tiktok.com", "twitter.com", "x.com"];

function esRed(host: string): boolean {
  return REDES.some((r) => host === r || host.endsWith(`.${r}`));
}

/** La web del negocio, con esquema; null si no es una URL http(s) o es una red social. */
export function webPropia(bruta: string | null | undefined): string | null {
  const limpia = (bruta ?? "").trim();
  if (!limpia) return null;
  const conEsquema = /^[a-z][a-z0-9+.-]*:/i.test(limpia) ? limpia : `https://${limpia}`;
  try {
    const url = new URL(conEsquema);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    if (!host.includes(".")) return null;
    if (esRed(host)) return null;
    return conEsquema;
  } catch {
    return null;
  }
}

/** Teléfono comparable: solo dígitos y, si es español, sus nueve dígitos sin
 *  prefijo (`+34 911 99 55 72`, `0034911995572` y `911995572` son el mismo).
 *  null si es demasiado corto para ser un teléfono. */
export function normalizarTelefono(bruto: string | null | undefined): string | null {
  let d = (bruto ?? "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("34")) d = d.slice(2);
  return d.length >= 9 ? d : null;
}

/** Web comparable: dominio sin `www` + ruta, sin esquema ni barra final. */
export function huellaWeb(bruta: string | null | undefined): string | null {
  const web = webPropia(bruta);
  if (!web) return null;
  const url = new URL(web);
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const ruta = url.pathname.replace(/\/+$/, "").toLowerCase();
  return host + ruta;
}

/** Clave para buscar por texto: sin tildes, minúsculas, espacios simples. */
export function claveTexto(texto: string | null | undefined): string {
  return (texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export interface FichaComparable {
  city: string | null;
  phone: string | null;
  website: string | null;
}

/** Quita de `candidatos` los que ya están en `existentes` o repetidos entre sí.
 *  Dos fichas son el mismo negocio si comparten teléfono, o web y municipio: la
 *  web sola no basta, porque las sedes de una cadena comparten dominio. */
export function quitarDuplicados<T extends FichaComparable>(candidatos: T[], existentes: FichaComparable[]): T[] {
  const telefonos = new Set<string>();
  const webs = new Set<string>();
  const anotar = (f: FichaComparable) => {
    const tel = normalizarTelefono(f.phone);
    const web = huellaWeb(f.website);
    if (tel) telefonos.add(tel);
    if (web) webs.add(`${claveTexto(f.city)}|${web}`);
  };
  existentes.forEach(anotar);

  const salida: T[] = [];
  for (const c of candidatos) {
    const tel = normalizarTelefono(c.phone);
    const web = huellaWeb(c.website);
    if ((tel && telefonos.has(tel)) || (web && webs.has(`${claveTexto(c.city)}|${web}`))) continue;
    anotar(c);
    salida.push(c);
  }
  return salida;
}
