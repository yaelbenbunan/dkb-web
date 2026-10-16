/**
 * Landing «Pack Campaña + CRM» para proveedores deportivos.
 *
 * Todo lo que se dice en la página —precio, opciones del formulario, FAQ— vive
 * aquí, para que la página, el JSON-LD y la validación del servidor no puedan
 * contar cosas distintas. Puro: sin red ni `server-only`.
 */
import { z } from "zod";

export const PD_PATH = "/proveedores-deportivos";
export const PD_GRACIAS_PATH = "/proveedores-deportivos/gracias";
/** Marca de /panel/ventas donde entran las solicitudes. Se crea a mano en el panel. */
export const MARCA_PROVEEDORES_DEPORTIVOS_SLUG = "proveedores-deportivos";

export const PD_PRECIO = "350 €";
export const PD_PRECIO_NUMERO = "350";
export const PD_PRECIO_SUFIJO = "+ IVA/mes";
export const PD_BADGE = `PACK CAMPAÑA + CRM · ${PD_PRECIO} ${PD_PRECIO_SUFIJO.toUpperCase()}`;

export const PD_META_TITLE = "Pack Campaña + CRM para proveedores deportivos | dinkbit";
export const PD_META_DESCRIPTION =
  "Campañas en Meta con muestras gratis para que gimnasios y clubes de pádel prueben tu producto, y un CRM para seguir cada lead hasta el pedido. 350 € + IVA/mes.";

export const PD_PRODUCTOS = [
  { valor: "padel", etiqueta: "Material de pádel" },
  { valor: "equipaciones", etiqueta: "Equipaciones personalizadas" },
  { valor: "merchandising", etiqueta: "Merchandising para centros" },
  { valor: "consumibles", etiqueta: "Consumibles de gimnasio" },
  { valor: "suelos", etiqueta: "Suelos y equipamiento" },
  { valor: "trofeos", etiqueta: "Trofeos y medallas" },
  { valor: "nutricion", etiqueta: "Nutrición deportiva" },
  { valor: "otro", etiqueta: "Otro" },
] as const;

export const PD_DESTINOS = [
  { valor: "gimnasios", etiqueta: "Gimnasios" },
  { valor: "clubes_padel", etiqueta: "Clubes de pádel" },
  { valor: "boxes", etiqueta: "Boxes CrossFit" },
  { valor: "clubes_deportivos", etiqueta: "Clubes de fútbol y deportivos" },
  { valor: "estudios", etiqueta: "Estudios de pilates o yoga" },
  { valor: "eventos", etiqueta: "Organizadores de eventos" },
] as const;

export const PD_FACTURACION = [
  { valor: "menos_100k", etiqueta: "<100k€" },
  { valor: "100k_500k", etiqueta: "100k–500k€" },
  { valor: "500k_2m", etiqueta: "500k–2M€" },
  { valor: "mas_2m", etiqueta: ">2M€" },
] as const;

export const PD_MUESTRAS = [
  { valor: "si", etiqueta: "Sí" },
  { valor: "no", etiqueta: "No" },
  { valor: "depende", etiqueta: "Depende del producto" },
] as const;

export const PD_PRESUPUESTO = [
  { valor: "menos_500", etiqueta: "<500€" },
  { valor: "500_1500", etiqueta: "500–1.500€" },
  { valor: "1500_5000", etiqueta: "1.500–5.000€" },
  { valor: "mas_5000", etiqueta: ">5.000€" },
] as const;

/** `a: null` = respuesta pendiente: ni se pinta ni entra en el JSON-LD hasta que se rellene. */
export const PD_FAQS: readonly { q: string; a: string | null }[] = [
  { q: "¿Cuánto cuesta?", a: `El Pack Campaña + CRM cuesta ${PD_PRECIO} + IVA al mes. La inversión en anuncios de Meta se paga aparte, directamente a Meta.` },
  { q: "¿Qué incluye el CRM?", a: null },
  { q: "¿Hay permanencia?", a: null },
  { q: "¿Quién paga las muestras?", a: null },
  { q: "¿Cómo filtráis a los curiosos?", a: "Pedimos datos del negocio (nombre del centro, CIF o web, volumen de compra) antes de que se envíe ninguna muestra." },
  { q: "¿En cuánto tiempo veo resultados?", a: null },
  { q: "¿Trabajáis con cadenas de gimnasios?", a: null },
];

/** Las que se publican (página y JSON-LD): solo las que tienen respuesta. */
export const PD_FAQS_RESPONDIDAS = PD_FAQS.filter((f): f is { q: string; a: string } => f.a !== null);

type Catalogo = readonly { valor: string; etiqueta: string }[];
const valores = <C extends Catalogo>(c: C) => c.map((o) => o.valor) as [C[number]["valor"], ...C[number]["valor"][]];
const etiqueta = (c: Catalogo, v: string) => c.find((o) => o.valor === v)?.etiqueta ?? v;

/** Móvil o fijo español: 9 dígitos que empiezan por 6–9, con +34 opcional y separadores. Mismo criterio que web-299. */
const TELEFONO_RE = /^(?:\+34[\s.-]?)?[6-9](?:[\s.-]?\d){8}$/;
const texto = (msg: string) => z.string().trim().min(2, msg).max(200, "Demasiado largo");

export const pasoUnoSchema = z.object({
  nombre: texto("Escribe tu nombre y apellidos"),
  empresa: texto("Escribe el nombre de tu empresa"),
  web: texto("Escribe tu web o tu Instagram"),
  email: z.email("Revisa tu correo"),
  telefono: z.string().trim().regex(TELEFONO_RE, "Escribe un teléfono español válido (9 dígitos)"),
});

export const solicitudSchema = pasoUnoSchema.extend({
  producto: z.enum(valores(PD_PRODUCTOS), "Elige qué vendes"),
  destinos: z.array(z.enum(valores(PD_DESTINOS), "Elige a quién quieres vender")).min(1, "Elige al menos uno"),
  facturacion: z.enum(valores(PD_FACTURACION), "Elige tu facturación"),
  muestras: z.enum(valores(PD_MUESTRAS), "Dinos si podéis enviar muestras"),
  presupuesto: z.enum(valores(PD_PRESUPUESTO), "Elige un presupuesto"),
  privacidad: z.literal(true, "Tienes que aceptar la política de privacidad"),
});

export type Solicitud = z.infer<typeof solicitudSchema>;
export type ErroresSolicitud = Partial<Record<keyof Solicitud, string>>;

function errores(e: z.ZodError): ErroresSolicitud {
  const r: ErroresSolicitud = {};
  for (const i of e.issues) {
    const k = i.path[0] as keyof Solicitud;
    if (k && !r[k]) r[k] = i.message;
  }
  return r;
}

export function leerSolicitud(fd: FormData): { ok: true; datos: Solicitud } | { ok: false; errores: ErroresSolicitud } {
  const s = (k: string) => String(fd.get(k) ?? "");
  const r = solicitudSchema.safeParse({
    nombre: s("nombre"),
    empresa: s("empresa"),
    web: s("web"),
    email: s("email"),
    telefono: s("telefono"),
    producto: s("producto"),
    destinos: fd.getAll("destinos").map(String),
    facturacion: s("facturacion"),
    muestras: s("muestras"),
    presupuesto: s("presupuesto"),
    privacidad: fd.get("privacidad") === "on",
  });
  return r.success ? { ok: true, datos: r.data } : { ok: false, errores: errores(r.error) };
}

/** Lo que el CRM no tiene como columna, como nota inicial del lead. */
export function notaSolicitudPack(s: Solicitud): string {
  return [
    "Desde la landing de proveedores deportivos (Pack Campaña + CRM).",
    `Web / Instagram: ${s.web}`,
    `Qué vende: ${etiqueta(PD_PRODUCTOS, s.producto)}`,
    `A quién quiere vender: ${s.destinos.map((d) => etiqueta(PD_DESTINOS, d)).join(", ")}`,
    `Facturación anual: ${etiqueta(PD_FACTURACION, s.facturacion)}`,
    `Muestras gratuitas: ${etiqueta(PD_MUESTRAS, s.muestras)}`,
    `Presupuesto mensual en publicidad: ${etiqueta(PD_PRESUPUESTO, s.presupuesto)}`,
  ].join("\n");
}
