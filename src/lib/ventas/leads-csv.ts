/**
 * Importación de listas de prospección (CSV) del módulo de ventas.
 *
 * Módulo puro: el panel lo usa para previsualizar el fichero y la server
 * action lo repite sobre el texto crudo antes de guardar, así que una
 * previsualización manipulada no cuela filas. Reutiliza el lector de CSV del
 * CRM (`src/lib/leads-csv.ts`), que ya resuelve comillas, BOM y Excel en
 * Windows-1252.
 */

import { decodeCsvBytes, normalizeKey, parseCsvRows, type CsvRowError } from "../leads-csv";
import {
  normalizarCif,
  normalizarEmail,
  normalizarTelefono,
  parseTipoNegocio,
  type TipoNegocio,
} from "./dominio";

export { decodeCsvBytes };

export const VENTAS_CSV_HEADERS = [
  "negocio",
  "tipo_negocio",
  "contacto",
  "telefono",
  "email",
  "ciudad",
  "cif",
  "web",
] as const;
type Cabecera = (typeof VENTAS_CSV_HEADERS)[number];

export const VENTAS_CSV_MAX_ROWS = 2000;

export const EMAIL_RE = /^[^\s@]+@[^\s@.]+\.[^\s@]+$/;

export interface LeadNuevo {
  negocio: string;
  tipo_negocio: TipoNegocio | null;
  contacto: string;
  telefono: string;
  email: string;
  ciudad: string;
  cif: string;
  web: string;
}

export interface ParsedVentasCsv {
  filas: LeadNuevo[];
  /** Filas que impiden importar el fichero. */
  errores: CsvRowError[];
  /** Filas que se importan, pero con algo que conviene revisar. */
  avisos: CsvRowError[];
  cabecerasDesconocidas: string[];
}

const ALIAS: Record<string, Cabecera> = {
  negocio: "negocio",
  empresa: "negocio",
  nombre: "negocio",
  nombrenegocio: "negocio",
  razonsocial: "negocio",
  tiponegocio: "tipo_negocio",
  tipo: "tipo_negocio",
  categoria: "tipo_negocio",
  sector: "tipo_negocio",
  contacto: "contacto",
  personacontacto: "contacto",
  persona: "contacto",
  telefono: "telefono",
  tel: "telefono",
  movil: "telefono",
  phone: "telefono",
  email: "email",
  correo: "email",
  mail: "email",
  ciudad: "ciudad",
  localidad: "ciudad",
  poblacion: "ciudad",
  city: "ciudad",
  cif: "cif",
  nif: "cif",
  web: "web",
  website: "web",
  url: "web",
};

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function parseVentasLeadsCsv(text: string): ParsedVentasCsv {
  const rows = parseCsvRows(text);
  const vacio: ParsedVentasCsv = { filas: [], errores: [], avisos: [], cabecerasDesconocidas: [] };
  if (rows.length === 0) {
    return { ...vacio, errores: [{ line: 1, message: "El fichero está vacío." }] };
  }

  const [cabecera, ...datos] = rows;
  const columnas = new Map<Cabecera, number>();
  const desconocidas: string[] = [];
  cabecera.cells.forEach((celda, i) => {
    const col = ALIAS[normalizeKey(celda)];
    if (col && !columnas.has(col)) columnas.set(col, i);
    else if (!col && celda.trim()) desconocidas.push(celda.trim());
  });

  if (!columnas.has("negocio")) {
    return {
      ...vacio,
      cabecerasDesconocidas: desconocidas,
      errores: [{ line: 1, message: "Falta la columna «negocio». Descarga la plantilla para ver el formato." }],
    };
  }

  const filas: LeadNuevo[] = [];
  const errores: CsvRowError[] = [];
  const avisos: CsvRowError[] = [];

  for (const row of datos) {
    if (row.cells.every((c) => c.trim() === "")) continue;
    const celda = (col: Cabecera) => {
      const i = columnas.get(col);
      return i === undefined ? "" : (row.cells[i] ?? "").trim();
    };

    const lead: LeadNuevo = {
      negocio: celda("negocio"),
      tipo_negocio: null,
      contacto: celda("contacto"),
      telefono: celda("telefono"),
      email: celda("email"),
      ciudad: celda("ciudad"),
      cif: celda("cif"),
      web: celda("web"),
    };

    const problemas: string[] = [];
    if (!lead.negocio) problemas.push("falta el nombre del negocio");
    if (!normalizarTelefono(lead.telefono) && !lead.email) problemas.push("hace falta teléfono o email");
    if (lead.email && !EMAIL_RE.test(lead.email)) problemas.push(`email no válido («${lead.email}»)`);
    if (problemas.length > 0) {
      errores.push({ line: row.line, message: capitalizar(problemas.join("; ")) + "." });
      continue;
    }

    const tipoCrudo = celda("tipo_negocio");
    if (tipoCrudo) {
      lead.tipo_negocio = parseTipoNegocio(tipoCrudo);
      if (!lead.tipo_negocio) {
        avisos.push({ line: row.line, message: `Tipo de negocio desconocido («${tipoCrudo}»): se importa sin tipo.` });
      }
    }
    filas.push(lead);
  }

  if (filas.length + errores.length > VENTAS_CSV_MAX_ROWS) {
    errores.unshift({ line: 1, message: `Como máximo ${VENTAS_CSV_MAX_ROWS} filas por fichero: divídelo en varios.` });
  }

  return { filas, errores, avisos, cabecerasDesconocidas: desconocidas };
}

export function plantillaVentasCsv(): string {
  return (
    VENTAS_CSV_HEADERS.join(",") +
    "\n" +
    "Gimnasio Ejemplo,gimnasio,Laura Pérez,600111222,laura@ejemplo.com,Madrid,B12345678,https://ejemplo.com\n"
  );
}

export interface Contacto {
  email?: string | null;
  telefono?: string | null;
  cif?: string | null;
}

export function clavesContacto(c: Contacto): string[] {
  const claves: string[] = [];
  const email = normalizarEmail(c.email);
  if (email) claves.push(`e:${email}`);
  const telefono = normalizarTelefono(c.telefono);
  if (telefono) claves.push(`t:${telefono}`);
  const cif = normalizarCif(c.cif);
  if (cif) claves.push(`c:${cif}`);
  return claves;
}

/**
 * Reparte los leads entrantes. Excluido (ya era cliente de la marca, por
 * email, teléfono o CIF) pesa más que duplicado. Los duplicados se buscan solo
 * por email y teléfono, que son los índices únicos de la tabla; también cuentan
 * las repeticiones dentro del propio lote.
 */
export function clasificarLeads<T extends Contacto>(
  entrantes: T[],
  existentes: Contacto[],
  exclusiones: Contacto[],
): { nuevos: T[]; duplicados: T[]; excluidos: T[] } {
  const excluidas = new Set(exclusiones.flatMap(clavesContacto));
  const vistas = new Set(existentes.flatMap((c) => clavesContacto({ email: c.email, telefono: c.telefono })));
  const out = { nuevos: [] as T[], duplicados: [] as T[], excluidos: [] as T[] };

  for (const lead of entrantes) {
    if (clavesContacto(lead).some((k) => excluidas.has(k))) {
      out.excluidos.push(lead);
      continue;
    }
    const claves = clavesContacto({ email: lead.email, telefono: lead.telefono });
    if (claves.some((k) => vistas.has(k))) {
      out.duplicados.push(lead);
      continue;
    }
    claves.forEach((k) => vistas.add(k));
    out.nuevos.push(lead);
  }
  return out;
}
