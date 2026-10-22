/**
 * Archivos del formulario de alta: qué admite cada campo, cómo se sanea el
 * nombre y dónde se guarda. Puro (sin red ni entorno): lo usan la página
 * pública para avisar antes de subir y el servidor para decidir si firma la
 * subida y si acepta la ruta al enviar. Manda siempre el servidor.
 *
 * Los archivos van a un bucket PRIVADO (`altas-clientes`): el navegador sube
 * directamente con una URL firmada que pide al servidor por cada archivo, para
 * no pasar por el límite de 4,5 MB del cuerpo de las funciones de Vercel.
 */

export const BUCKET_ALTAS = "altas-clientes";

/** 50 MB: el mismo tope que el bucket (`file_size_limit`). */
export const MAX_BYTES_ARCHIVO = 50 * 1024 * 1024;

/** Tipos MIME que se aceptan por extensión. El navegador no siempre sabe el
 *  tipo de un .ai, un .eps o un .heic: vacío u octet-stream también valen. */
const MIMES: Record<string, readonly string[]> = {
  svg: ["image/svg+xml"],
  ai: ["application/postscript", "application/illustrator", "application/pdf", "application/vnd.adobe.illustrator"],
  eps: ["application/postscript", "application/eps", "application/x-eps", "image/eps", "image/x-eps"],
  pdf: ["application/pdf"],
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  webp: ["image/webp"],
  heic: ["image/heic", "image/heif"],
  mp4: ["video/mp4"],
  mov: ["video/quicktime"],
};

const MIMES_GENERICOS = new Set(["", "application/octet-stream"]);

export interface CampoArchivo {
  /** Carpeta del alta en el bucket. */
  seccion: string;
  etiqueta: string;
  extensiones: readonly string[];
  /** Cómo se dicen los formatos en los mensajes. */
  formatos: string;
  /** Tope de archivos que se guardan en el campo. */
  maxArchivos: number;
}

export const CAMPOS_ARCHIVO = {
  logo: {
    seccion: "diseno",
    etiqueta: "Logo",
    extensiones: ["svg", "ai", "eps", "pdf", "png"],
    formatos: "SVG, AI, EPS, PDF o PNG",
    maxArchivos: 10,
  },
  manual: {
    seccion: "diseno",
    etiqueta: "Manual de identidad",
    extensiones: ["pdf"],
    formatos: "PDF",
    maxArchivos: 3,
  },
  fotos: {
    seccion: "diseno",
    etiqueta: "Fotos y vídeos",
    extensiones: ["jpg", "jpeg", "png", "webp", "heic", "mp4", "mov"],
    formatos: "JPG, PNG, WEBP, HEIC, MP4 o MOV",
    maxArchivos: 40,
  },
} as const satisfies Record<string, CampoArchivo>;

export type NombreCampoArchivo = keyof typeof CAMPOS_ARCHIVO;

export function esCampoArchivo(campo: unknown): campo is NombreCampoArchivo {
  return typeof campo === "string" && Object.prototype.hasOwnProperty.call(CAMPOS_ARCHIVO, campo);
}

/** Lo que se guarda de cada archivo en `alta_clientes.archivos`. */
export interface ArchivoAlta {
  campo: NombreCampoArchivo;
  ruta: string;
  nombre: string;
  tamano: number;
  tipo: string;
}

export function extensionDe(nombre: string): string {
  const punto = nombre.lastIndexOf(".");
  return punto >= 0 ? nombre.slice(punto + 1).toLowerCase() : "";
}

export function aceptAttr(campo: NombreCampoArchivo): string {
  return CAMPOS_ARCHIVO[campo].extensiones.map((e) => `.${e}`).join(",");
}

export type Validacion = { ok: true; extension: string } | { ok: false; error: string };

export function validarArchivo(campo: string, nombre: string, tamano: number, tipo: string): Validacion {
  if (!esCampoArchivo(campo)) return { ok: false, error: "Ese campo no admite archivos." };
  const config = CAMPOS_ARCHIVO[campo];
  const extension = extensionDe(typeof nombre === "string" ? nombre : "");
  if (!(config.extensiones as readonly string[]).includes(extension)) {
    return { ok: false, error: `${config.etiqueta}: formato no admitido. Usa ${config.formatos}.` };
  }
  const t = (typeof tipo === "string" ? tipo : "").toLowerCase().trim();
  if (!MIMES_GENERICOS.has(t) && !(MIMES[extension] ?? []).includes(t)) {
    return { ok: false, error: `${config.etiqueta}: el archivo no parece un ${extension.toUpperCase()} de verdad.` };
  }
  if (typeof tamano !== "number" || !Number.isFinite(tamano) || tamano <= 0) {
    return { ok: false, error: "El archivo está vacío." };
  }
  if (tamano > MAX_BYTES_ARCHIVO) {
    return { ok: false, error: "El archivo pesa más de 50 MB. Para vídeos grandes, pega un enlace de Drive o WeTransfer." };
  }
  return { ok: true, extension };
}

const LARGO_MAX_NOMBRE = 100;

/** Nombre apto para una ruta de Storage: sin carpetas, sin acentos, en
 *  minúsculas y solo con letras, números y guiones (más la extensión). */
export function sanearNombreArchivo(original: string): string {
  const base = (original ?? "").split(/[\\/]/).pop() ?? "";
  const plano = base.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const punto = plano.lastIndexOf(".");
  const raiz = punto >= 0 ? plano.slice(0, punto) : plano;
  const ext = (punto >= 0 ? plano.slice(punto + 1) : "").replace(/[^a-z0-9]/g, "").slice(0, 10);
  const sufijo = ext ? `.${ext}` : "";
  const limpia =
    raiz
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, LARGO_MAX_NOMBRE - sufijo.length)
      .replace(/-+$/, "") || "archivo";
  return `${limpia}${sufijo}`;
}

const UUID_RE = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/** `<alta_id>/<sección>/<uuid>-<nombre-saneado>`. */
export function construirRuta(altaId: string, campo: NombreCampoArchivo, nombre: string, uuid: string): string {
  return `${altaId}/${CAMPOS_ARCHIVO[campo].seccion}/${uuid}-${sanearNombreArchivo(nombre)}`;
}

/** ¿La ruta es una de las que firma el servidor para este alta y vale para el campo? */
export function rutaEsDelCampo(ruta: unknown, altaId: string, campo: NombreCampoArchivo): boolean {
  if (typeof ruta !== "string" || ruta.length > 300) return false;
  const seccion = CAMPOS_ARCHIVO[campo].seccion;
  const forma = new RegExp(`^([0-9a-f-]{36})/([a-z]+)/${UUID_RE}-[a-z0-9-]+(\\.[a-z0-9]+)?$`);
  const m = forma.exec(ruta);
  if (!m || m[1] !== altaId || m[2] !== seccion) return false;
  return (CAMPOS_ARCHIVO[campo].extensiones as readonly string[]).includes(extensionDe(ruta));
}

/** Tope por alta, sumando todos los campos: frena que un enlace válido se use
 *  para llenar el bucket. Para más, un enlace de Drive o WeTransfer. */
export const MAX_ARCHIVOS_ALTA = 40;
export const MAX_BYTES_ALTA = 1024 * 1024 * 1024;

export const ERROR_CUPO = "Has llegado al máximo de 40 archivos o 1 GB en total. Quita alguno o pega un enlace de Drive o WeTransfer.";

/** ¿Cabe un archivo más de `tamano` bytes sobre lo que ya ocupa el alta? */
export function cabeEnElCupo(uso: { archivos: number; bytes: number }, tamano: number): boolean {
  return uso.archivos + 1 <= MAX_ARCHIVOS_ALTA && uso.bytes + tamano <= MAX_BYTES_ALTA;
}

/** ¿La ruta es de este alta, para alguno de los campos? */
export function rutaEsDelAlta(ruta: unknown, altaId: string): boolean {
  return (Object.keys(CAMPOS_ARCHIVO) as NombreCampoArchivo[]).some((c) => rutaEsDelCampo(ruta, altaId, c));
}
