/**
 * De HTML a una dirección a la que escribir.
 *
 * Tres pasos separados porque fallan por motivos distintos: encontrar
 * direcciones (expresiones regulares sobre HTML sucio), decidir si son del
 * negocio o de un tercero, y decidir si son un buzón o una persona. Lo último
 * importa por la LSSI: a un buzón genérico publicado se le puede escribir con
 * más tranquilidad que a una persona.
 */
import type { TipoEmail } from "./tipos";

const RE_EMAIL = /[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/gi;
const RE_MAILTO = /mailto:([^"'?>\s]+)/gi;
const EXT_FICHERO = /\.(png|jpe?g|gif|webp|svg|css|js|ico|woff2?)$/i;

/** Buzones que no atiende nadie o que existen para otra cosa (protección de
 *  datos): escribirles una oferta comercial no llega a quien decide. */
const LOCALES_BASURA =
  /^(no-?reply|donotreply|noresponder|postmaster|mailer-daemon|abuse|privacy|privacidad|dpo|dpd|lopd|rgpd)$/;

const DOMINIOS_BASURA = [
  "sentry.io",
  "wixpress.com",
  "example.com",
  "ejemplo.com",
  "domain.com",
  "dominio.com",
  "tudominio.com",
  "email.com",
  "wordpress.org",
  "schema.org",
  "w3.org",
];

const GRATUITOS = new Set([
  "gmail.com",
  "hotmail.com",
  "hotmail.es",
  "outlook.com",
  "outlook.es",
  "yahoo.com",
  "yahoo.es",
  "live.com",
  "msn.com",
  "icloud.com",
  "telefonica.net",
  "movistar.es",
]);

const GENERICAS = new Set([
  "info",
  "informacion",
  "contacto",
  "contact",
  "hola",
  "hello",
  "reservas",
  "reserva",
  "booking",
  "bookings",
  "administracion",
  "admin",
  "oficina",
  "comercial",
  "ventas",
  "atencion",
  "atencionalcliente",
  "clientes",
  "recepcion",
  "general",
  "mail",
  "correo",
  "email",
  "pedidos",
  "citas",
  "consultas",
  "secretaria",
  "gerencia",
  "direccion",
  "marketing",
  "tienda",
  "web",
  "eventos",
]);

function sinWww(host: string): string {
  return host.toLowerCase().replace(/^www\./, "");
}

function esBasura(email: string): boolean {
  const [local, dominio] = email.split("@");
  if (!local || !dominio) return true;
  if (EXT_FICHERO.test(email)) return true;
  if (LOCALES_BASURA.test(local)) return true;
  // Las claves de Sentry y similares son ristras hexadecimales largas.
  if (/^[a-f0-9]{24,}$/.test(local)) return true;
  return DOMINIOS_BASURA.some((d) => dominio === d || dominio.endsWith(`.${d}`));
}

/** Todas las direcciones que aparecen en el HTML, en minúsculas y sin repetir.
 *  Los `<script>` y `<style>` no se leen: ahí viven las claves de terceros. */
export function extraerEmails(html: string): string[] {
  const encontrados = new Set<string>();

  for (const m of html.matchAll(RE_MAILTO)) {
    try {
      encontrados.add(decodeURIComponent(m[1]));
    } catch {
      encontrados.add(m[1]);
    }
  }

  const texto = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/&#(?:64|x40);/gi, "@")
    .replace(/&#(?:46|x2e);/gi, ".")
    .replace(/\s*[\[(]\s*(?:at|arroba)\s*[\])]\s*/gi, "@")
    .replace(/\s*[\[(]\s*(?:dot|punto)\s*[\])]\s*/gi, ".");
  for (const m of texto.matchAll(RE_EMAIL)) encontrados.add(m[0]);

  const limpios = new Set<string>();
  for (const bruto of encontrados) {
    const email = bruto.trim().toLowerCase().replace(/\.+$/, "");
    if (/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email) && !esBasura(email)) limpios.add(email);
  }
  return [...limpios];
}

/** Plataformas que alojan webs de terceros en un subdominio suyo: que la web
 *  esté en `negocio.wixsite.com` no hace del negocio las direcciones de
 *  `wixsite.com`. */
const PLATAFORMAS = new Set([
  "wixsite.com",
  "wix.com",
  "wordpress.com",
  "blogspot.com",
  "webnode.es",
  "webnode.com",
  "jimdofree.com",
  "jimdosite.com",
  "weebly.com",
  "squarespace.com",
  "godaddysites.com",
  "negocio.site",
  "business.site",
  "shopify.com",
  "myshopify.com",
  "github.io",
  "netlify.app",
  "vercel.app",
]);

/** El dominio del email es del negocio si es el de su web o un subdominio suyo,
 *  o si la web es un subdominio del dominio del email y ese dominio no es una
 *  plataforma de alojamiento. */
function esPropio(dominioEmail: string, dominioWeb: string): boolean {
  const a = sinWww(dominioEmail);
  const b = sinWww(dominioWeb);
  if (a === b || a.endsWith(`.${b}`)) return true;
  if (!b.endsWith(`.${a}`)) return false;
  return ![...PLATAFORMAS].some((p) => a === p || a.endsWith(`.${p}`));
}

function obtenerEtiquetaPrincipal(dominio: string): string {
  const sinPrefijo = sinWww(dominio);
  const primera = sinPrefijo.split(".")[0];
  return primera.toLowerCase();
}

function tipoDe(local: string, propio: boolean, dominioWeb: string): TipoEmail {
  const primera = local.split(/[._-]/)[0].replace(/[0-9]+$/, "");
  if (GENERICAS.has(primera)) return "generica";

  // Para direcciones no propias (proveedores gratuitos), se considera genérica
  // si el local part contiene la etiqueta principal del dominio (3+ caracteres)
  if (!propio) {
    const etiqueta = obtenerEtiquetaPrincipal(dominioWeb);
    if (etiqueta.length >= 3 && local.toLowerCase().includes(etiqueta)) {
      return "generica";
    }
  }

  // Una dirección de un dominio del negocio o una de proveedor gratuito sin
  // coincidencia con el nombre del negocio: suele ser personal.
  return "personal";
}

/** La mejor dirección para escribir a ese negocio, o null si no hay ninguna que
 *  sea suya. Las de otros dominios que no sean proveedores gratuitos se
 *  descartan: suelen ser de la agencia que hizo la web. */
export function elegirEmail(
  emails: string[],
  dominioWeb: string,
): { email: string; tipo: TipoEmail } | null {
  const candidatas = emails
    .map((email) => {
      const [local, dominio] = email.split("@");
      const propio = esPropio(dominio, dominioWeb);
      const gratuito = GRATUITOS.has(dominio);
      if (!propio && !gratuito) return null;
      const tipo = tipoDe(local, propio, dominioWeb);
      const orden = tipo === "generica" ? (propio ? 0 : 1) : propio ? 2 : 3;
      return { email, tipo, orden };
    })
    .filter((c): c is { email: string; tipo: TipoEmail; orden: number } => c !== null)
    .sort((a, b) => a.orden - b.orden);
  const mejor = candidatas[0];
  return mejor ? { email: mejor.email, tipo: mejor.tipo } : null;
}

const RE_ENLACE = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
const RE_CONTACTO = /contact|aviso-?\s?legal|legal/i;
const MAX_ENLACES = 2;

/** Enlaces internos a las páginas donde un negocio suele publicar su email. */
export function enlacesDeContacto(html: string, base: URL): string[] {
  const enlaces: string[] = [];
  for (const m of html.matchAll(RE_ENLACE)) {
    const href = m[1].trim();
    if (/^(mailto:|tel:|javascript:|#)/i.test(href)) continue;
    const texto = m[2].replace(/<[^>]+>/g, " ");
    if (!RE_CONTACTO.test(href) && !RE_CONTACTO.test(texto)) continue;
    let url: URL;
    try {
      url = new URL(href, base);
    } catch {
      continue;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") continue;
    if (sinWww(url.hostname) !== sinWww(base.hostname)) continue;
    url.hash = "";
    const final = url.toString();
    if (!enlaces.includes(final)) enlaces.push(final);
    if (enlaces.length === MAX_ENLACES) break;
  }
  return enlaces;
}
