/**
 * Entrada pública de leads desde formularios web de las marcas (landing B2B).
 *
 * La ruta con secreto (/api/ventas/leads/[slug]) sirve para Zapier y servidores;
 * un formulario en una web estática (Shopify) dejaría el secreto a la vista. Esta
 * entrada no lleva secreto y se acota por origen, campo trampa y límite por IP.
 */

// Orígenes exactos (esquema + host) desde los que cada marca puede enviar.
export const ORIGENES_POR_MARCA: Record<string, readonly string[]> = {
  hydrup: [
    "https://drinkhydrup.com",
    "https://www.drinkhydrup.com",
    "https://drinkhydrup.myshopify.com",
  ],
};

export function origenPermitido(slug: string, origin: string | null): boolean {
  if (!origin) return false;
  return (ORIGENES_POR_MARCA[slug] ?? []).includes(origin);
}

// Campo oculto en el formulario: una persona no lo ve; un bot lo rellena.
export function esEnvioBot(datos: Record<string, unknown>): boolean {
  const v = datos.website_url;
  return typeof v === "string" && v.trim() !== "";
}

const MAX_CAMPO = 1000;

function campo(datos: Record<string, unknown>, clave: string): string {
  const v = datos[clave];
  return typeof v === "string" ? v.trim().slice(0, MAX_CAMPO) : "";
}

// Lo que el CRM no tiene como columna va como nota en la actividad del lead.
export function notaFormulario(datos: Record<string, unknown>): string | null {
  const lineas = [
    ["Socios", campo(datos, "socios")],
    ["Reparto", campo(datos, "reparto")],
    ["Comentarios", campo(datos, "comentarios")],
  ]
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`);
  return lineas.length ? ["Desde la web (landing B2B).", ...lineas].join("\n") : null;
}

// Memoria de instancia: con Fluid Compute se reutiliza entre peticiones, pero no
// se comparte entre instancias. Es un freno contra ráfagas, no una garantía.
export function crearLimitador(opts: { max: number; ventanaMs: number }) {
  const envios = new Map<string, number[]>();
  return (clave: string, ahora: number = Date.now()): boolean => {
    const recientes = (envios.get(clave) ?? []).filter((t) => ahora - t < opts.ventanaMs);
    if (recientes.length >= opts.max) {
      envios.set(clave, recientes);
      return false;
    }
    recientes.push(ahora);
    envios.set(clave, recientes);
    return true;
  };
}
