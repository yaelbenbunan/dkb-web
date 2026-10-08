/**
 * Plantillas de los correos de prospección: texto con `{{variables}}`.
 *
 * Sin `server-only`: el panel renderiza la vista previa en el navegador con
 * este mismo código, para que lo que se ve sea exactamente lo que sale.
 */

export const VARIABLES = ["empresa", "ciudad", "sector", "web"] as const;
type Variable = (typeof VARIABLES)[number];

export type DatosPlantilla = Record<Variable, string | null>;

const RE_VARIABLE = /\{\{\s*([^{}\s]+)\s*\}\}/g;

export function datosDeProspecto(p: {
  name: string;
  city: string | null;
  sector: string | null;
  website: string | null;
}): DatosPlantilla {
  const web = p.website
    ? p.website.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/+$/, "")
    : null;
  return { empresa: p.name, ciudad: p.city, sector: p.sector, web };
}

/** Sustituye las variables. Si alguna no tiene dato —o no existe, porque está
 *  mal escrita— no devuelve texto: un correo con `{{empresa}}` a la vista hace
 *  más daño que no mandarlo. */
export function renderPlantilla(
  texto: string,
  datos: DatosPlantilla,
): { ok: true; texto: string } | { ok: false; faltan: string[] } {
  const faltan: string[] = [];
  const salida = texto.replace(RE_VARIABLE, (_, bruta: string) => {
    const nombre = bruta.toLowerCase();
    const valor = (VARIABLES as readonly string[]).includes(nombre)
      ? (datos[nombre as Variable] ?? "").trim()
      : "";
    if (!valor) {
      if (!faltan.includes(nombre)) faltan.push(nombre);
      return "";
    }
    return valor;
  });
  return faltan.length > 0 ? { ok: false, faltan } : { ok: true, texto: salida };
}

function escapar(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Texto plano → HTML mínimo: escapado, URLs enlazadas y saltos de línea. */
export function textoAHtml(texto: string): string {
  return escapar(texto)
    .replace(/https?:\/\/(?:[^\s<&]|&amp;)+/g, (url) => {
      const cola = url.match(/[.,;:!?)]+$/)?.[0] ?? "";
      const limpia = cola ? url.slice(0, -cola.length) : url;
      return `<a href="${limpia}">${limpia}</a>${cola}`;
    })
    .replace(/\r?\n/g, "<br>");
}
