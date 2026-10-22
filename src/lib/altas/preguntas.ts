/**
 * Las preguntas del formulario de alta de clientes (/alta/<token>) y su
 * validación. Una sola fuente: de aquí salen el formulario público, la
 * validación del servidor (zod, campo a campo) y la vista del panel.
 * Las preguntas van en código a propósito: editarlas desde el panel queda
 * fuera de alcance. Puro: sin red ni entorno.
 *
 * Al cambiar un `id`, las respuestas ya guardadas con el id viejo dejan de
 * verse en el panel (siguen en la base): no se renombran ids sin migrar.
 */

import { z } from "zod";
import type { NombreCampoArchivo } from "./archivos";

export type TipoCampo =
  | "texto"
  | "textoLargo"
  | "email"
  | "telefono"
  | "url"
  | "opcion"
  | "casillas"
  | "siNo"
  | "consentimiento"
  | "competencia"
  | "archivos";

export interface Opcion {
  valor: string;
  etiqueta: string;
}

export interface CampoAlta {
  id: string;
  etiqueta: string;
  tipo: TipoCampo;
  obligatorio?: boolean;
  ayuda?: string;
  placeholder?: string;
  opciones?: readonly Opcion[];
  /** Tope de caracteres (texto). */
  max?: number;
  /** Solo se enseña en el formulario cuando otro campo tiene ese valor
   *  (o lo incluye, si es de casillas). El servidor lo valida igual. */
  visibleSi?: { campo: string; valor: string | boolean };
  /** Para `archivos`: qué campo de archivos.ts es. */
  archivo?: NombreCampoArchivo;
}

export interface SeccionAlta {
  id: string;
  titulo: string;
  descripcion?: string;
  campos: readonly CampoAlta[];
}

const SI_NO_TEXTO = "Sí";

export const SECCIONES_ALTA: readonly SeccionAlta[] = [
  {
    id: "contacto",
    titulo: "Contacto y facturación",
    descripcion: "Con quién hablamos y a quién facturamos.",
    campos: [
      { id: "contacto_nombre", etiqueta: "Nombre de la persona de contacto", tipo: "texto", obligatorio: true },
      { id: "contacto_email", etiqueta: "Email de contacto", tipo: "email", obligatorio: true },
      { id: "contacto_telefono", etiqueta: "Teléfono de contacto", tipo: "telefono", obligatorio: true },
      { id: "razon_social", etiqueta: "Razón social", tipo: "texto", obligatorio: true },
      { id: "cif", etiqueta: "CIF", tipo: "texto", obligatorio: true, max: 20 },
      { id: "direccion_facturacion", etiqueta: "Dirección de facturación", tipo: "texto", obligatorio: true, max: 300 },
      { id: "email_facturas", etiqueta: "Email para enviar las facturas", tipo: "email", obligatorio: true },
    ],
  },
  {
    id: "diseno",
    titulo: "Diseño e identidad",
    descripcion: "Lo que necesitamos para que los anuncios se parezcan a vosotros.",
    campos: [
      {
        id: "logo",
        etiqueta: "Logo editable",
        tipo: "archivos",
        archivo: "logo",
        obligatorio: true,
        ayuda: "Mejor en vectorial (SVG, AI, EPS o PDF) y, si lo tenéis, un PNG con fondo transparente. Podéis subir varios.",
      },
      { id: "manual", etiqueta: "Manual de identidad", tipo: "archivos", archivo: "manual", ayuda: "En PDF, si lo tenéis." },
      {
        id: "colores_tipografias",
        etiqueta: "Si no tenéis manual: colores y tipografías",
        tipo: "texto",
        max: 300,
        placeholder: "Por ejemplo: azul #0B3AE7, Montserrat",
      },
      {
        id: "fotos",
        etiqueta: "Fotos y vídeos propios",
        tipo: "archivos",
        archivo: "fotos",
        ayuda: "Del equipo, la oficina, el producto o clientes (con su permiso). Hasta 50 MB por archivo.",
      },
      {
        id: "fotos_enlace",
        etiqueta: "Enlace a Drive o WeTransfer",
        tipo: "url",
        ayuda: "Para vídeos o carpetas que pesen más de 50 MB.",
        placeholder: "https://",
      },
      {
        id: "tono",
        etiqueta: "Tono de comunicación",
        tipo: "opcion",
        opciones: [
          { valor: "cercano", etiqueta: "Cercano" },
          { valor: "profesional", etiqueta: "Profesional" },
          { valor: "tecnico", etiqueta: "Técnico" },
          { valor: "desenfadado", etiqueta: "Desenfadado" },
        ],
      },
      { id: "no_usar", etiqueta: "Palabras, mensajes o imágenes que no queréis que usemos", tipo: "textoLargo" },
    ],
  },
  {
    id: "negocio",
    titulo: "Negocio y servicios",
    campos: [
      { id: "servicios", etiqueta: "Servicios principales, por orden de prioridad", tipo: "textoLargo", obligatorio: true },
      { id: "diferencia", etiqueta: "Qué os diferencia de la competencia", tipo: "textoLargo", obligatorio: true },
      { id: "precios_oferta", etiqueta: "Precios u oferta que queráis destacar en las campañas", tipo: "textoLargo" },
      { id: "competencia", etiqueta: "Competencia directa", tipo: "competencia", ayuda: "Hasta 5: nombre y web." },
      { id: "marcas_referencia", etiqueta: "Marcas cuya publicidad os guste", tipo: "textoLargo", ayuda: "Del sector o de fuera, y qué os gusta de ella." },
    ],
  },
  {
    id: "publico",
    titulo: "Público",
    campos: [
      {
        id: "tipo_cliente",
        etiqueta: "¿A quién vendéis?",
        tipo: "opcion",
        obligatorio: true,
        opciones: [
          { valor: "b2b", etiqueta: "A empresas (B2B)" },
          { valor: "b2c", etiqueta: "A particulares (B2C)" },
          { valor: "ambos", etiqueta: "A ambos" },
        ],
      },
      { id: "cliente_ideal", etiqueta: "Cómo es vuestro cliente ideal", tipo: "textoLargo", obligatorio: true, ayuda: "Sector, tamaño, cargo de quien decide, edad, intereses…" },
      {
        id: "zona",
        etiqueta: "Zona geográfica",
        tipo: "opcion",
        obligatorio: true,
        opciones: [
          { valor: "local", etiqueta: "Local" },
          { valor: "provincia", etiqueta: "Provincia" },
          { valor: "espana", etiqueta: "Toda España" },
          { valor: "internacional", etiqueta: "Internacional" },
        ],
      },
      { id: "zona_detalle", etiqueta: "Concreta la zona", tipo: "texto", max: 300, placeholder: "Ciudad, provincia o países" },
      { id: "estacionalidad", etiqueta: "Estacionalidad", tipo: "textoLargo", ayuda: "Meses fuertes y flojos, campañas fijas del año." },
    ],
  },
  {
    id: "cuentas",
    titulo: "Cuentas y accesos",
    campos: [
      { id: "facebook", etiqueta: "¿Tenéis página de Facebook?", tipo: "siNo" },
      { id: "facebook_url", etiqueta: "Enlace a la página de Facebook", tipo: "url", visibleSi: { campo: "facebook", valor: true } },
      { id: "instagram", etiqueta: "¿Tenéis Instagram?", tipo: "siNo" },
      { id: "instagram_url", etiqueta: "Enlace al perfil de Instagram", tipo: "url", visibleSi: { campo: "instagram", valor: true } },
      { id: "portfolio_meta", etiqueta: "¿Tenéis portfolio comercial de Meta (Business Manager)?", tipo: "siNo" },
      { id: "cuenta_publicitaria", etiqueta: "¿Tenéis cuenta publicitaria o habéis hecho anuncios antes?", tipo: "siNo" },
      {
        id: "experiencia_previa",
        etiqueta: "Cuéntanos la experiencia: qué se hizo y qué tal fue",
        tipo: "textoLargo",
        visibleSi: { campo: "cuenta_publicitaria", valor: true },
      },
      { id: "web", etiqueta: "Web", tipo: "url", placeholder: "https://" },
      { id: "web_gestor", etiqueta: "Quién gestiona la web", tipo: "texto" },
      { id: "whatsapp_telefono", etiqueta: "WhatsApp de empresa", tipo: "telefono" },
      {
        id: "whatsapp_tipo",
        etiqueta: "Tipo de WhatsApp",
        tipo: "opcion",
        opciones: [
          { valor: "normal", etiqueta: "WhatsApp normal" },
          { valor: "business", etiqueta: "WhatsApp Business" },
          { valor: "no", etiqueta: "No tenemos" },
        ],
      },
    ],
  },
  {
    id: "presupuesto",
    titulo: "Presupuesto y pago",
    campos: [
      {
        id: "presupuesto",
        etiqueta: "Presupuesto mensual en anuncios",
        tipo: "opcion",
        obligatorio: true,
        ayuda: "Lo que se paga a Meta, aparte de nuestros honorarios.",
        opciones: [
          { valor: "menos_300", etiqueta: "Menos de 300 €" },
          { valor: "300_600", etiqueta: "300–600 €" },
          { valor: "600_1200", etiqueta: "600–1.200 €" },
          { valor: "mas_1200", etiqueta: "Más de 1.200 €" },
          { valor: "a_definir", etiqueta: "A definir" },
        ],
      },
      {
        id: "forma_pago",
        etiqueta: "Cómo se paga la publicidad",
        tipo: "opcion",
        obligatorio: true,
        opciones: [
          { valor: "tarjeta", etiqueta: "Tarjeta en la cuenta publicitaria, a vuestro nombre" },
          { valor: "paypal", etiqueta: "PayPal" },
        ],
      },
    ],
  },
  {
    id: "objetivos",
    titulo: "Objetivos",
    campos: [
      {
        id: "objetivos_branding",
        etiqueta: "Qué buscáis con el branding los primeros 3 meses",
        tipo: "casillas",
        opciones: [
          { valor: "conocer", etiqueta: "Que nos conozcan" },
          { valor: "trafico", etiqueta: "Tráfico a la web" },
          { valor: "seguidores", etiqueta: "Seguidores" },
          { valor: "otro", etiqueta: "Otro" },
        ],
      },
      { id: "objetivos_otro", etiqueta: "¿Qué otro objetivo?", tipo: "texto", visibleSi: { campo: "objetivos_branding", valor: "otro" } },
      { id: "buen_lead", etiqueta: "Qué es para vosotros un buen cliente potencial", tipo: "textoLargo" },
      { id: "atencion_leads", etiqueta: "Quién atiende los contactos, por qué vía y en cuánto tiempo", tipo: "textoLargo" },
      {
        id: "crm",
        etiqueta: "CRM",
        tipo: "opcion",
        opciones: [
          { valor: "ninguno", etiqueta: "Ninguno" },
          { valor: "dinkbit", etiqueta: "El de Dinkbit" },
          { valor: "otro", etiqueta: "Otro" },
        ],
      },
      { id: "crm_otro", etiqueta: "¿Cuál?", tipo: "texto", visibleSi: { campo: "crm", valor: "otro" } },
    ],
  },
  {
    id: "legal",
    titulo: "Legal",
    campos: [
      { id: "privacidad_url", etiqueta: "Enlace a vuestra política de privacidad", tipo: "url", placeholder: "https://" },
      {
        id: "consentimiento_marca",
        etiqueta: "Autorizo a Dinkbit a usar nuestro logo, imágenes y marca en las campañas que haga para nosotros.",
        tipo: "consentimiento",
        obligatorio: true,
      },
    ],
  },
];

export const CAMPOS_ALTA: readonly CampoAlta[] = SECCIONES_ALTA.flatMap((s) => s.campos);

/* Validación ------------------------------------------------------------------ */

const MAX_TEXTO = 200;
const MAX_TEXTO_LARGO = 4000;
const MAX_URL = 500;
const MAX_COMPETIDORES = 5;

const TELEFONO_RE = /^\+?[0-9 ().-]{6,25}$/;
const ESQUEMA_RE = /^[a-z][a-z0-9+.-]*:/i;

/** Espacios fuera; vacío = sin contestar. */
const limpiar = (v: unknown) => {
  if (typeof v !== "string") return v ?? undefined;
  const t = v.trim();
  return t === "" ? undefined : t;
};

/** «nubosoft.es» → «https://nubosoft.es». Lo que ya trae esquema se deja tal cual
 *  (y si no es http/https, la validación lo rechaza). */
const conEsquema = (v: unknown) => {
  const t = limpiar(v);
  return typeof t === "string" && !ESQUEMA_RE.test(t) ? `https://${t}` : t;
};

const urlHttp = z.url({ protocol: /^https?$/, hostname: z.regexes.domain }).max(MAX_URL);

function esquemaDe(campo: CampoAlta): z.ZodType {
  switch (campo.tipo) {
    case "texto":
      return z.preprocess(limpiar, z.string().max(campo.max ?? MAX_TEXTO).optional());
    case "textoLargo":
      return z.preprocess(limpiar, z.string().max(campo.max ?? MAX_TEXTO_LARGO).optional());
    case "email":
      return z.preprocess((v) => {
        const t = limpiar(v);
        return typeof t === "string" ? t.toLowerCase() : t;
      }, z.email().max(MAX_TEXTO).optional());
    case "telefono":
      return z.preprocess(limpiar, z.string().regex(TELEFONO_RE).optional());
    case "url":
      return z.preprocess(conEsquema, urlHttp.optional());
    case "opcion":
      return z.preprocess(limpiar, z.enum((campo.opciones ?? []).map((o) => o.valor) as [string, ...string[]]).optional());
    case "casillas":
      return z
        .array(z.enum((campo.opciones ?? []).map((o) => o.valor) as [string, ...string[]]))
        .max(20)
        .optional()
        .transform((lista) => (lista && lista.length ? [...new Set(lista)] : undefined));
    case "siNo":
      return z
        .boolean()
        .nullable()
        .optional()
        .transform((v) => (v === null ? undefined : v));
    case "consentimiento":
      return z
        .boolean()
        .optional()
        .transform((v) => (v ? true : undefined));
    case "competencia":
      return z
        .array(z.object({ nombre: z.unknown(), web: z.unknown() }))
        .max(20)
        .optional()
        .transform((filas) => (filas ?? []).map((f) => ({ nombre: limpiar(f.nombre), web: conEsquema(f.web) })).filter((f) => f.nombre !== undefined || f.web !== undefined) as { nombre?: unknown; web?: unknown }[])
        .pipe(
          z
            .array(z.object({ nombre: z.string().max(120), web: urlHttp.optional() }))
            .max(MAX_COMPETIDORES)
            .transform((filas) => (filas.length ? filas.map((f) => (f.web ? f : { nombre: f.nombre })) : undefined)),
        );
    case "archivos":
      // Los archivos no van en las respuestas: los valida acciones.ts aparte.
      return z.unknown().transform(() => undefined);
  }
}

function errorDe(campo: CampoAlta, issue: z.core.$ZodIssue | undefined): string {
  const nombre = `«${campo.etiqueta.replace(/[?¿:]/g, "").trim()}»`;
  switch (campo.tipo) {
    case "email":
      return `${nombre}: escribe un email válido.`;
    case "telefono":
      return `${nombre}: escribe un teléfono válido (solo números, espacios y +).`;
    case "url":
      return `${nombre}: escribe una dirección web válida (que empiece por https://).`;
    case "competencia":
      return issue?.code === "too_big" && issue.path.length === 0
        ? `${nombre}: como mucho ${MAX_COMPETIDORES}.`
        : `${nombre}: revisa los nombres (máximo 120 caracteres) y las webs (que empiecen por https://).`;
    case "opcion":
    case "casillas":
      return `${nombre}: elige una de las opciones.`;
    default:
      if (issue?.code === "too_big" && "maximum" in issue) return `${nombre}: es demasiado largo (máximo ${String(issue.maximum)} caracteres).`;
      return `${nombre}: el valor no es válido.`;
  }
}

export type RespuestasAlta = Record<string, unknown>;

/** ¿Se cumple el `visibleSi` del campo con estas respuestas? Sin condición, sí. */
export function cumpleCondicion(campo: CampoAlta, valores: Record<string, unknown>): boolean {
  if (!campo.visibleSi) return true;
  const actual = valores[campo.visibleSi.campo];
  return Array.isArray(actual) ? actual.includes(campo.visibleSi.valor) : actual === campo.visibleSi.valor;
}
/** `campo`: la pregunta con el error, para llevar al usuario hasta ella. */
export type LeidoAlta = { ok: true; datos: RespuestasAlta } | { ok: false; error: string; campo?: string };

/**
 * Valida y limpia las respuestas que manda el navegador. Solo se quedan las
 * claves que son preguntas (lo demás se descarta); devuelve el primer error,
 * en el orden del formulario, para enseñarlo tal cual.
 */
export function leerRespuestasAlta(entrada: unknown): LeidoAlta {
  if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) return { ok: false, error: "No se han recibido las respuestas." };
  const bruto = entrada as Record<string, unknown>;
  const datos: RespuestasAlta = {};
  for (const campo of CAMPOS_ALTA) {
    if (campo.tipo === "archivos") continue;
    const valor = Object.prototype.hasOwnProperty.call(bruto, campo.id) ? bruto[campo.id] : undefined;
    const r = esquemaDe(campo).safeParse(valor);
    if (!r.success) return { ok: false, error: errorDe(campo, r.error.issues[0]), campo: campo.id };
    if (r.data === undefined) {
      if (campo.obligatorio) {
        return {
          ok: false,
          campo: campo.id,
          error:
            campo.tipo === "consentimiento"
              ? "Necesitamos tu autorización para usar vuestro logo, imágenes y marca en las campañas."
              : `Falta «${campo.etiqueta.replace(/[?¿:]/g, "").trim()}».`,
        };
      }
      continue;
    }
    datos[campo.id] = r.data;
  }
  // Lo que depende de otra respuesta solo se guarda si esa respuesta lo pide
  // (p. ej. el enlace de Facebook con «¿Tenéis Facebook?» en «No» se descarta).
  for (const campo of CAMPOS_ALTA) {
    if (campo.visibleSi && campo.id in datos && !cumpleCondicion(campo, datos)) delete datos[campo.id];
  }
  return { ok: true, datos };
}

/** El valor guardado, en texto para el panel y el correo. "" si no se contestó. */
export function valorLegible(campo: CampoAlta, valor: unknown): string {
  if (valor === undefined || valor === null || valor === "") return "";
  const etiquetaDe = (v: unknown) => campo.opciones?.find((o) => o.valor === v)?.etiqueta ?? String(v);
  switch (campo.tipo) {
    case "opcion":
      return etiquetaDe(valor);
    case "casillas":
      return Array.isArray(valor) ? valor.map(etiquetaDe).join(", ") : "";
    case "siNo":
      return valor === true ? SI_NO_TEXTO : valor === false ? "No" : "";
    case "consentimiento":
      return valor === true ? SI_NO_TEXTO : "";
    case "competencia":
      return Array.isArray(valor)
        ? valor
            .map((f: { nombre?: string; web?: string }) => (f.web ? `${f.nombre ?? ""} (${f.web})`.trim() : (f.nombre ?? "")))
            .filter(Boolean)
            .join(" · ")
        : "";
    default:
      return typeof valor === "string" ? valor : JSON.stringify(valor);
  }
}
