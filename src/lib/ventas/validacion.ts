/**
 * Validación de lo que llega de los formularios de /panel/ventas. Cada lector
 * recibe el FormData tal cual y devuelve datos limpios o el primer error en
 * español, listo para enseñarlo. Las server actions nunca escriben nada que
 * no haya pasado por aquí.
 */

import { z } from "zod";
import {
  ESTADOS_MARCA,
  FASES,
  RESULTADOS_LLAMADA,
  ROLES,
  TIPOS_NEGOCIO,
  normalizarCif,
  normalizarEmail,
  normalizarTelefono,
  slugify,
  type EstadoMarca,
  type Fase,
  type ResultadoLlamada,
  type Rol,
} from "./dominio";
import { EMAIL_RE, type LeadNuevo } from "./leads-csv";

export type Leido<T> = { ok: true; datos: T } | { ok: false; error: string };

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

function campo(fd: FormData, clave: string): string {
  return String(fd.get(clave) ?? "").trim();
}

function leer<T>(schema: z.ZodType<T>, valor: unknown): Leido<T> {
  const r = schema.safeParse(valor);
  return r.success
    ? { ok: true, datos: r.data }
    : { ok: false, error: r.error.issues[0]?.message ?? "Datos no válidos." };
}

/** «1.234,56», «12,5 €» o «12.5» → céntimos. Vacío es 0; basura es null. */
export function eurosACentimos(raw: string): number | null {
  const limpio = raw
    .trim()
    .replace(/[\s€]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  if (!limpio) return 0;
  const n = Number(limpio);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

/* Usuarias ------------------------------------------------------------------ */

export interface NuevaUsuaria {
  nombre: string;
  email: string;
  password: string;
  rol: Rol;
}

const passwordSchema = z.string().min(10, "La contraseña necesita al menos 10 caracteres.");

export function leerPassword(raw: string): Leido<string> {
  return leer(passwordSchema, raw);
}

export function leerNuevaUsuaria(fd: FormData): Leido<NuevaUsuaria> {
  return leer(
    z.object({
      nombre: z.string().min(2, "Pon el nombre.").max(60, "Nombre demasiado largo."),
      email: z.string().toLowerCase().pipe(z.email("Email no válido.")),
      password: passwordSchema,
      rol: z.enum(ROLES, { message: "Elige un rol." }),
    }),
    {
      nombre: campo(fd, "nombre"),
      email: campo(fd, "email"),
      password: String(fd.get("password") ?? ""),
      rol: campo(fd, "rol"),
    },
  );
}

/* Marcas -------------------------------------------------------------------- */

export interface NuevaMarca {
  nombre: string;
  slug: string;
}

/** Rutas fijas de /panel/ventas: una marca con ese slug quedaría tapada. */
const SLUGS_RESERVADOS = ["hoy", "usuarias", "login"];

export function leerNuevaMarca(fd: FormData): Leido<NuevaMarca> {
  const nombre = campo(fd, "nombre");
  const slug = campo(fd, "slug") || slugify(nombre);
  if (SLUGS_RESERVADOS.includes(slug)) return { ok: false, error: "Ese identificador está reservado: elige otro." };
  return leer(
    z.object({
      nombre: z.string().min(2, "Pon el nombre de la marca.").max(80, "Nombre demasiado largo."),
      slug: z
        .string()
        .max(40, "Identificador demasiado largo.")
        .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "El identificador solo admite minúsculas, números y guiones."),
    }),
    { nombre, slug },
  );
}

export interface Condiciones {
  estado: EstadoMarca;
  fecha_inicio: string | null;
  cuota_mensual_cts: number;
  comision_pct: number;
  plazo_meses: number | null;
  pago_por_cliente_cts: number;
  skus_b2b: string[];
}

export function leerCondiciones(fd: FormData): Leido<Condiciones> {
  const cuota = eurosACentimos(campo(fd, "cuota_mensual"));
  const pago = eurosACentimos(campo(fd, "pago_por_cliente"));
  if (cuota === null || pago === null) return { ok: false, error: "Importe no válido." };
  const plazo = campo(fd, "plazo_meses");
  return leer(
    z.object({
      estado: z.enum(ESTADOS_MARCA, { message: "Estado no válido." }),
      fecha_inicio: z.string().regex(FECHA_RE, "Fecha de inicio no válida.").nullable(),
      cuota_mensual_cts: z.number().int().min(0, "La cuota no puede ser negativa."),
      comision_pct: z
        .number({ message: "Porcentaje no válido." })
        .min(0, "El porcentaje no puede ser negativo.")
        .max(100, "El porcentaje no puede pasar de 100."),
      plazo_meses: z
        .number({ message: "Plazo no válido." })
        .int("El plazo va en meses enteros.")
        .positive("El plazo debe ser de al menos un mes (vacío = para siempre).")
        .nullable(),
      pago_por_cliente_cts: z.number().int().min(0, "El pago por cliente no puede ser negativo."),
      skus_b2b: z.array(z.string().min(1).max(80, "SKU demasiado largo.")).max(200, "Demasiados SKU."),
    }),
    {
      estado: campo(fd, "estado"),
      fecha_inicio: campo(fd, "fecha_inicio") || null,
      cuota_mensual_cts: cuota,
      comision_pct: Number(campo(fd, "comision_pct").replace(",", ".") || "0"),
      plazo_meses: plazo ? Number(plazo) : null,
      pago_por_cliente_cts: pago,
      skus_b2b: campo(fd, "skus_b2b")
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    },
  );
}

export interface NuevaExclusion {
  nombre: string;
  email: string;
  telefono: string;
  cif: string;
}

export function leerExclusion(fd: FormData): Leido<NuevaExclusion> {
  const datos = {
    nombre: campo(fd, "nombre"),
    email: campo(fd, "email"),
    telefono: campo(fd, "telefono"),
    cif: campo(fd, "cif"),
  };
  if (!normalizarEmail(datos.email) && !normalizarTelefono(datos.telefono) && !normalizarCif(datos.cif)) {
    return { ok: false, error: "Indica al menos email, teléfono o CIF." };
  }
  if (datos.email && !EMAIL_RE.test(datos.email)) return { ok: false, error: "Email no válido." };
  return { ok: true, datos };
}

/* Leads --------------------------------------------------------------------- */

export function leerDatosLead(fd: FormData): Leido<LeadNuevo> {
  const tipo = campo(fd, "tipo_negocio");
  const r = leer(
    z.object({
      negocio: z.string().min(1, "Falta el nombre del negocio.").max(120, "Nombre demasiado largo."),
      tipo_negocio: z.enum(TIPOS_NEGOCIO, { message: "Tipo de negocio no válido." }).nullable(),
      contacto: z.string().max(120),
      telefono: z.string().max(40),
      email: z.string().max(120).refine((v) => !v || EMAIL_RE.test(v), "Email no válido."),
      ciudad: z.string().max(80),
      cif: z.string().max(20),
      web: z.string().max(200),
    }),
    {
      negocio: campo(fd, "negocio"),
      tipo_negocio: tipo || null,
      contacto: campo(fd, "contacto"),
      telefono: campo(fd, "telefono"),
      email: campo(fd, "email"),
      ciudad: campo(fd, "ciudad"),
      cif: campo(fd, "cif"),
      web: campo(fd, "web"),
    },
  );
  if (r.ok && !normalizarTelefono(r.datos.telefono) && !r.datos.email) {
    return { ok: false, error: "Hace falta teléfono o email." };
  }
  return r;
}

const proximoSchema = z.string().regex(FECHA_RE, "Fecha de seguimiento no válida.").nullable();
const notaSchema = z.string().max(2000, "La nota es demasiado larga.");

export interface Llamada {
  resultado: ResultadoLlamada;
  nota: string;
  proximo_seguimiento: string | null;
}

export function leerLlamada(fd: FormData): Leido<Llamada> {
  return leer(
    z.object({
      resultado: z.enum(RESULTADOS_LLAMADA, { message: "Elige el resultado de la llamada." }),
      nota: notaSchema,
      proximo_seguimiento: proximoSchema,
    }),
    {
      resultado: campo(fd, "resultado"),
      nota: campo(fd, "nota"),
      proximo_seguimiento: campo(fd, "proximo_seguimiento") || null,
    },
  );
}

export interface NotaSeguimiento {
  nota: string;
  proximo_seguimiento: string | null;
}

export function leerNotaSeguimiento(fd: FormData): Leido<NotaSeguimiento> {
  return leer(z.object({ nota: notaSchema, proximo_seguimiento: proximoSchema }), {
    nota: campo(fd, "nota"),
    proximo_seguimiento: campo(fd, "proximo_seguimiento") || null,
  });
}

export interface CambioFase {
  fase: Fase;
  nota: string;
}

export function leerCambioFase(fd: FormData): Leido<CambioFase> {
  return leer(z.object({ fase: z.enum(FASES, { message: "Fase no válida." }), nota: notaSchema }), {
    fase: campo(fd, "fase"),
    nota: campo(fd, "nota"),
  });
}
