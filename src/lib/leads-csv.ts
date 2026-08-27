/**
 * Importación masiva de leads desde CSV.
 *
 * Módulo puro (sin `server-only`, sin Supabase) porque lo usan los dos lados:
 * el panel para previsualizar el fichero antes de subirlo, y la server action
 * para volver a parsearlo antes de insertar. El servidor NUNCA se fía de lo que
 * manda el cliente: recibe el texto crudo y repite este mismo parseo, así que
 * una previsualización manipulada no puede colar filas inválidas.
 */

import { LEAD_STATUSES, STATUS_LABELS, type LeadStatus } from "./lead-status";

/** Cabeceras de la plantilla, en el orden en que se descargan. */
export const LEADS_CSV_HEADERS = [
  "nombre",
  "telefono",
  "email",
  "web",
  "canal",
  "campana",
  "estado",
  "consentimiento",
  "notas",
] as const;

export type LeadsCsvHeader = (typeof LEADS_CSV_HEADERS)[number];

/** Canales válidos. Mismo listado que el selector del panel. */
export const CSV_CHANNELS = [
  "Web",
  "google ads",
  "Meta",
  "Microsoft Ads",
  "LinkedIn",
  "TikTok",
  "landing",
] as const;

/** Nº máximo de filas por importación: evita bloquear el panel con un fichero
 *  gigante y mantiene el insert dentro de lo que Supabase acepta de una vez. */
export const LEADS_CSV_MAX_ROWS = 1000;

export interface CsvLeadInput {
  name: string;
  phone: string;
  email: string;
  website: string;
  channel: string;
  campaign: string;
  notes: string;
  status: LeadStatus;
  /** null = no se indicó nada; el lead queda sin consentimiento definido. */
  consent: boolean | null;
}

export interface CsvRowError {
  /** Nº de línea tal y como lo ve quien abre el fichero (1 = cabecera). */
  line: number;
  message: string;
}

export interface ParsedLeadsCsv {
  rows: CsvLeadInput[];
  errors: CsvRowError[];
  /** Cabeceras del fichero que no reconocemos (se ignoran, se avisa). */
  unknownHeaders: string[];
}

/* -------------------------------------------------------------------------- */
/* Parseo de CSV                                                              */
/* -------------------------------------------------------------------------- */

/** Detecta el separador mirando la primera línea: Excel en español exporta con
 *  `;`, Google Sheets y casi todo lo demás con `,`. */
export function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const count = (ch: string) => firstLine.split(ch).length - 1;
  const candidates: Array<[string, number]> = [
    [",", count(",")],
    [";", count(";")],
    ["\t", count("\t")],
  ];
  candidates.sort((a, b) => b[1] - a[1]);
  return candidates[0][1] > 0 ? candidates[0][0] : ",";
}

export interface CsvRow {
  cells: string[];
  /** Línea del fichero en la que empieza la fila (1 = primera). Se conserva
   *  aunque la fila lleve saltos de línea dentro de comillas, porque es el
   *  número que se le enseña a quien tiene que ir a corregir el CSV. */
  line: number;
}

/**
 * CSV a filas de celdas, siguiendo RFC 4180: comillas dobles para escapar el
 * separador y los saltos de línea, `""` para una comilla literal dentro del
 * campo. Devuelve las filas tal cual (sin recortar espacios ni descartar nada),
 * cada una con su nº de línea real.
 */
export function parseCsvRows(text: string, delimiter = detectDelimiter(text)): CsvRow[] {
  // Quita el BOM que Excel pone al principio: si no, la primera cabecera pasa a
  // llamarse "\uFEFFnombre" y deja de reconocerse.
  const input = text.replace(/^\uFEFF/, "");
  const rows: CsvRow[] = [];
  let cells: string[] = [];
  let field = "";
  let inQuotes = false;
  let line = 1;
  let rowLine = 1;
  let rowStarted = false;

  const startRow = () => {
    if (!rowStarted) {
      rowLine = line;
      rowStarted = true;
    }
  };

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        if (ch === "\n") line++;
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      startRow();
      inQuotes = true;
    } else if (ch === delimiter) {
      startRow();
      cells.push(field);
      field = "";
    } else if (ch === "\n") {
      startRow();
      cells.push(field);
      rows.push({ cells, line: rowLine });
      cells = [];
      field = "";
      line++;
      rowStarted = false;
    } else if (ch === "\r") {
      // Fin de línea Windows: el "\n" que viene detrás cierra la fila.
    } else {
      startRow();
      field += ch;
    }
  }
  // Última fila sin salto de línea final.
  if (field !== "" || cells.length > 0) {
    cells.push(field);
    rows.push({ cells, line: rowLine });
  }
  return rows;
}

/** Igual que `parseCsvRows` pero solo con las celdas — para tests y usos donde
 *  el nº de línea no hace falta. */
export function parseCsv(text: string, delimiter = detectDelimiter(text)): string[][] {
  return parseCsvRows(text, delimiter).map((r) => r.cells);
}

/**
 * Bytes del fichero a texto. Se intenta UTF-8 y, si aparecen caracteres de
 * reemplazo (el fichero venía en Windows-1252, que es lo que suelta "Guardar
 * como CSV" del Excel español), se vuelve a decodificar en esa codificación.
 * Sin esto, "García" llega como "GarcÃ­a" y se guarda así en el CRM.
 */
export function decodeCsvBytes(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const utf8 = new TextDecoder("utf-8").decode(view);
  if (!utf8.includes("\uFFFD")) return utf8;
  try {
    return new TextDecoder("windows-1252").decode(view);
  } catch {
    return utf8;
  }
}

/* -------------------------------------------------------------------------- */
/* Normalización de valores                                                   */
/* -------------------------------------------------------------------------- */

/** Minúsculas, sin acentos y sin signos: para comparar cabeceras y etiquetas
 *  sin que "Teléfono", "telefono" o "TELEFONO" cuenten como cosas distintas. */
export function normalizeKey(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

// Sinónimos aceptados por columna, para que valga tanto la plantilla como un
// export de otra herramienta sin tener que renombrar cabeceras a mano.
const HEADER_ALIASES: Record<string, LeadsCsvHeader> = {
  nombre: "nombre",
  name: "nombre",
  nombreyapellidos: "nombre",
  contacto: "nombre",
  telefono: "telefono",
  tlf: "telefono",
  tel: "telefono",
  movil: "telefono",
  phone: "telefono",
  email: "email",
  correo: "email",
  correoelectronico: "email",
  mail: "email",
  web: "web",
  website: "web",
  sitioweb: "web",
  url: "web",
  canal: "canal",
  channel: "canal",
  origen: "canal",
  campana: "campana",
  campaign: "campana",
  estado: "estado",
  status: "estado",
  etiqueta: "estado",
  consentimiento: "consentimiento",
  consent: "consentimiento",
  rgpd: "consentimiento",
  notas: "notas",
  notes: "notas",
  observaciones: "notas",
};

/** Estado a partir del slug ("kit-digital") o de la etiqueta visible del panel
 *  ("Interés en Kit Digital"). Vacío = "nuevo"; desconocido = null. */
export function parseStatus(raw: string): LeadStatus | null {
  const v = raw.trim();
  if (!v) return "nuevo";
  const key = normalizeKey(v);
  const bySlug = LEAD_STATUSES.find((s) => normalizeKey(s) === key);
  if (bySlug) return bySlug;
  const byLabel = LEAD_STATUSES.find(
    (s) => normalizeKey(STATUS_LABELS[s] ?? "") === key,
  );
  return byLabel ?? null;
}

const CONSENT_YES = new Set(["si", "sí", "yes", "true", "1", "x", "y", "verdadero"]);
const CONSENT_NO = new Set(["no", "false", "0", "n", "falso"]);

/** true / false / null (sin definir). `undefined` = valor no reconocido. */
export function parseConsent(raw: string): boolean | null | undefined {
  const v = raw.trim().toLowerCase();
  if (!v) return null;
  if (CONSENT_YES.has(v)) return true;
  if (CONSENT_NO.has(v)) return false;
  return undefined;
}

/** Canal conocido respetando su capitalización oficial; si no lo conocemos se
 *  guarda tal cual (el panel ya sabe enseñar canales fuera de la lista). */
export function parseChannel(raw: string): string {
  const v = raw.trim();
  if (!v) return "Web";
  const key = normalizeKey(v);
  return CSV_CHANNELS.find((c) => normalizeKey(c) === key) ?? v;
}

// Validación deliberadamente laxa: solo descarta lo que seguro no es un email.
// Un filtro estricto rechazaría direcciones válidas y bloquearía la importación
// entera por una fila.
const EMAIL_RE = /^[^\s@]+@[^\s@.]+\.[^\s@]+$/;

/** Clave para detectar duplicados: email si lo hay, si no el teléfono en
 *  dígitos (así "+34 600 11 22 33" y "600112233" son el mismo lead). */
export function dedupeKey(lead: { email?: string | null; phone?: string | null }): string | null {
  const email = (lead.email ?? "").trim().toLowerCase();
  if (email) return `e:${email}`;
  const digits = (lead.phone ?? "").replace(/\D/g, "");
  // Un fijo español tiene 9 dígitos; por debajo de 6 no es un teléfono, es ruido.
  if (digits.length >= 6) return `p:${digits.slice(-9)}`;
  return null;
}

/* -------------------------------------------------------------------------- */
/* Parseo de leads                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Convierte el CSV en leads listos para insertar. Nunca lanza: cada fila mala
 * se reporta en `errors` con su nº de línea y el resto sigue adelante, que es
 * lo que espera quien sube 300 contactos y tiene tres emails mal escritos.
 */
export function parseLeadsCsv(text: string): ParsedLeadsCsv {
  const errors: CsvRowError[] = [];
  // Se descartan las filas en blanco y las líneas de leyenda de la plantilla
  // ("# estado admite: …") para poder importar el fichero de ejemplo tal cual,
  // pero cada fila conserva su nº de línea real: el aviso "línea 7" tiene que
  // llevar a la línea 7 del CSV abierto en Excel.
  const table = parseCsvRows(text).filter(
    (r) => r.cells.some((c) => c.trim() !== "") && !(r.cells[0] ?? "").trim().startsWith("#"),
  );

  if (table.length === 0) {
    return {
      rows: [],
      errors: [{ line: 1, message: "El fichero está vacío." }],
      unknownHeaders: [],
    };
  }

  const headerRow = table[0].cells;
  const unknownHeaders: string[] = [];
  const index: Partial<Record<LeadsCsvHeader, number>> = {};
  headerRow.forEach((h, i) => {
    const mapped = HEADER_ALIASES[normalizeKey(h)];
    if (!mapped) {
      if (h.trim()) unknownHeaders.push(h.trim());
      return;
    }
    // Con cabeceras repetidas gana la primera: la segunda sobrescribiría datos
    // ya leídos sin que nadie lo pida.
    if (index[mapped] === undefined) index[mapped] = i;
  });

  const hasIdentity =
    index.nombre !== undefined || index.telefono !== undefined || index.email !== undefined;
  if (!hasIdentity) {
    return {
      rows: [],
      errors: [
        {
          line: table[0].line,
          message:
            "No se reconoce ninguna columna de nombre, teléfono o email. Descarga la plantilla y usa esas cabeceras.",
        },
      ],
      unknownHeaders,
    };
  }

  const cell = (row: string[], key: LeadsCsvHeader): string => {
    const i = index[key];
    return i === undefined ? "" : (row[i] ?? "").trim();
  };

  const rows: CsvLeadInput[] = [];
  const seen = new Set<string>();
  const body = table.slice(1);

  if (body.length > LEADS_CSV_MAX_ROWS) {
    errors.push({
      line: body[LEADS_CSV_MAX_ROWS].line,
      message: `El fichero tiene ${body.length} filas con datos: solo se importarán las primeras ${LEADS_CSV_MAX_ROWS}.`,
    });
  }

  for (const { cells: row, line } of body.slice(0, LEADS_CSV_MAX_ROWS)) {
    const name = cell(row, "nombre");
    const phone = cell(row, "telefono");
    const email = cell(row, "email");

    if (!name && !phone && !email) {
      errors.push({ line, message: "Sin nombre, teléfono ni email: fila descartada." });
      continue;
    }
    if (email && !EMAIL_RE.test(email)) {
      errors.push({ line, message: `Email no válido (“${email}”): fila descartada.` });
      continue;
    }

    const status = parseStatus(cell(row, "estado"));
    if (status === null) {
      errors.push({
        line,
        message: `Estado desconocido (“${cell(row, "estado")}”): fila descartada.`,
      });
      continue;
    }

    const consent = parseConsent(cell(row, "consentimiento"));
    if (consent === undefined) {
      errors.push({
        line,
        message: `Consentimiento no válido (“${cell(row, "consentimiento")}”): usa Sí o No.`,
      });
      continue;
    }

    // Duplicados dentro del propio fichero: importar dos veces el mismo
    // contacto deja el CRM con dos fichas que hay que fusionar a mano.
    const key = dedupeKey({ email, phone });
    if (key && seen.has(key)) {
      errors.push({ line, message: "Repetido dentro del fichero: fila descartada." });
      continue;
    }
    if (key) seen.add(key);

    rows.push({
      name,
      phone,
      email,
      website: cell(row, "web"),
      channel: parseChannel(cell(row, "canal")),
      campaign: cell(row, "campana"),
      notes: cell(row, "notas"),
      status,
      consent,
    });
  }

  return { rows, errors, unknownHeaders };
}

/* -------------------------------------------------------------------------- */
/* Plantilla                                                                  */
/* -------------------------------------------------------------------------- */

const TEMPLATE_ROWS: string[][] = [
  [
    "Ana García",
    "+34 600 11 22 33",
    "ana@clinicadental.es",
    "clinicadental.es",
    "Web",
    "Kit Digital 2026",
    "nuevo",
    "Sí",
    "Pidió presupuesto por el formulario",
  ],
  [
    "Luis Romero",
    "911 22 33 44",
    "luis@tallerromero.com",
    "tallerromero.com",
    "google ads",
    "Feria octubre",
    "contactado",
    "No",
    "Llamar por la tarde",
  ],
  [
    "Marta Ruiz",
    "600998877",
    "",
    "",
    "LinkedIn",
    "",
    "cliente-kit-digital",
    "",
    "Sin email: se contacta por teléfono",
  ],
];

const csvCell = (v: string) => (/[",;\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const csvLine = (cells: string[]) => cells.map(csvCell).join(",");

/**
 * Plantilla de ejemplo. Lleva BOM para que Excel abra los acentos bien (sin él,
 * "Teléfono" aparece como "TelÃ©fono") y una fila de leyenda al final con los
 * valores admitidos en las columnas cerradas.
 */
export function leadsCsvTemplate(): string {
  const legend = [
    `# estado admite: ${LEAD_STATUSES.join(" | ")}`,
    `# canal admite: ${CSV_CHANNELS.join(" | ")}`,
    "# consentimiento admite: Sí | No | (vacío = sin definir)",
    "# nombre, teléfono y email: al menos uno relleno por fila",
    "# borra estas líneas y las de ejemplo antes de importar",
  ];
  return (
    "\uFEFF" +
    [
      csvLine([...LEADS_CSV_HEADERS]),
      ...TEMPLATE_ROWS.map(csvLine),
      "",
      ...legend,
    ].join("\r\n") +
    "\r\n"
  );
}
