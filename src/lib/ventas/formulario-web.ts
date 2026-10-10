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

// A quién se reenvía por email cada formulario de la marca, además de guardarlo en el CRM.
export const AVISOS_POR_MARCA: Record<string, readonly string[]> = {
  hydrup: ["info@drinkhydrup.com"],
};

export interface AvisoFormulario {
  to: string[];
  subject: string;
  text: string;
  replyTo?: string;
}

// El email lleva todo lo que mandó el formulario, para atenderlo sin entrar al CRM.
export function avisoFormulario(slug: string, datos: Record<string, unknown>): AvisoFormulario | null {
  const to = AVISOS_POR_MARCA[slug] ?? [];
  if (to.length === 0) return null;
  const negocio = campo(datos, "negocio") || campo(datos, "contacto");
  const email = campo(datos, "email");
  const lineas = [
    ["Centro", campo(datos, "negocio")],
    ["Contacto", campo(datos, "contacto")],
    ["Teléfono", campo(datos, "telefono")],
    ["Email", email],
    ["Ciudad", campo(datos, "ciudad")],
    ["CIF", campo(datos, "cif")],
    ["Socios", campo(datos, "socios")],
    ["Reparto", campo(datos, "reparto")],
  ]
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`);
  const comentarios = campo(datos, "comentarios");
  if (comentarios) lineas.push("", comentarios);
  return {
    to: [...to],
    subject: `Formulario web (landing B2B) — ${negocio}`,
    text: lineas.join("\n"),
    ...(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? { replyTo: email } : {}),
  };
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
