import "server-only";
import { leerPaginaSegura } from "../fetch-seguro";
import { isBlockedHost, normalizeUrl } from "../website-extract-guard";
import { elegirEmail, enlacesDeContacto, extraerEmails } from "./emails";
import type { TipoEmail } from "./tipos";

export type LectorPagina = (url: URL) => Promise<{ urlFinal: URL; html: string } | null>;

export interface ResultadoEnriquecer {
  email: string | null;
  tipo: TipoEmail | null;
  /** Por qué no hay email, para enseñarlo en la tabla. */
  nota: string | null;
}

const sinEmail = (nota: string): ResultadoEnriquecer => ({ email: null, tipo: null, nota });

/** Busca en la web de un negocio la mejor dirección a la que escribirle: la
 *  portada primero y, si no trae un buzón genérico, las páginas de contacto y
 *  aviso legal (tres páginas como mucho). `leer` es inyectable para las
 *  pruebas; por defecto pasa por la guardia SSRF. */
export async function enriquecerWeb(
  web: string | null,
  leer: LectorPagina = leerPaginaSegura,
): Promise<ResultadoEnriquecer> {
  if (!web || !web.trim()) return sinEmail("Sin web.");
  const url = normalizeUrl(web);
  if (!url || isBlockedHost(url.hostname)) return sinEmail("La web no responde.");

  const portada = await leer(url);
  if (!portada) return sinEmail("La web no responde.");

  const dominio = portada.urlFinal.hostname;
  const emails = extraerEmails(portada.html);
  let mejor = elegirEmail(emails, dominio);

  if (!mejor || mejor.tipo !== "generica") {
    for (const enlace of enlacesDeContacto(portada.html, portada.urlFinal)) {
      const pagina = await leer(new URL(enlace));
      if (pagina) emails.push(...extraerEmails(pagina.html));
    }
    mejor = elegirEmail(emails, dominio);
  }

  return mejor
    ? { email: mejor.email, tipo: mejor.tipo, nota: null }
    : sinEmail("La web no publica ningún email.");
}
