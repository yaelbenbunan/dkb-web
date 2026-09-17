/**
 * Vocabulario del módulo de ventas B2B: fases del lead, resultados de llamada,
 * tipos de negocio, roles y orígenes, y las reglas que los relacionan. Módulo
 * puro (sin `server-only`): lo usan las pantallas y el servidor.
 *
 * Fases, resultados, tipos de actividad, roles y orígenes tienen además un
 * CHECK en la base de datos (docs/sql/2026-09-17-ventas-fase1.sql): si se
 * añade un valor aquí, hay que añadirlo también allí. Los tipos de negocio no
 * tienen CHECK, a propósito: se amplían sin migración.
 */

import { normalizeKey } from "../leads-csv";

export const FASES = [
  "nuevo",
  "contactado",
  "interesado",
  "muestras",
  "cliente",
  "perdido",
  "no_interesa",
  "ilocalizable",
] as const;
export type Fase = (typeof FASES)[number];

export const FASE_LABELS: Record<Fase, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  interesado: "Interesado",
  muestras: "Muestras enviadas",
  cliente: "Cliente",
  perdido: "Perdido",
  no_interesa: "No le interesa",
  ilocalizable: "Ilocalizable",
};

export const FASE_COLORES: Record<Fase, { bg: string; text: string }> = {
  nuevo: { bg: "#e2e8f0", text: "#334155" },
  contactado: { bg: "#dbeafe", text: "#1e40af" },
  interesado: { bg: "#fef3c7", text: "#92400e" },
  muestras: { bg: "#ede9fe", text: "#5b21b6" },
  cliente: { bg: "#dcfce7", text: "#166534" },
  perdido: { bg: "#fee2e2", text: "#991b1b" },
  no_interesa: { bg: "#fee2e2", text: "#991b1b" },
  ilocalizable: { bg: "#f1f5f9", text: "#64748b" },
};

/** Fases en las que todavía se trabaja el lead: solo estas llevan seguimiento. */
export const FASES_ACTIVAS: readonly Fase[] = ["nuevo", "contactado", "interesado", "muestras"];

export function esFaseActiva(fase: string): boolean {
  return (FASES_ACTIVAS as readonly string[]).includes(fase);
}

export function esFase(v: unknown): v is Fase {
  return typeof v === "string" && (FASES as readonly string[]).includes(v);
}

export const RESULTADOS_LLAMADA = [
  "no_contesta",
  "volver_a_llamar",
  "interesado",
  "pide_muestras",
  "no_interesa",
  "numero_erroneo",
] as const;
export type ResultadoLlamada = (typeof RESULTADOS_LLAMADA)[number];

export const RESULTADO_LABELS: Record<ResultadoLlamada, string> = {
  no_contesta: "No contesta",
  volver_a_llamar: "Volver a llamar",
  interesado: "Interesado",
  pide_muestras: "Pide muestras",
  no_interesa: "No le interesa",
  numero_erroneo: "Número erróneo",
};

export const TIPOS_ACTIVIDAD = [
  "llamada",
  "nota",
  "cambio_fase",
  "muestras_enviadas",
  "pedido_vinculado",
  "lead_creado",
] as const;
export type TipoActividad = (typeof TIPOS_ACTIVIDAD)[number];

export const TIPOS_NEGOCIO = [
  "gimnasio",
  "box_crossfit",
  "club_deportivo",
  "fisioterapia",
  "farmacia",
  "tienda_deporte",
  "herbolario",
  "empresa",
  "otro",
] as const;
export type TipoNegocio = (typeof TIPOS_NEGOCIO)[number];

export const TIPO_NEGOCIO_LABELS: Record<TipoNegocio, string> = {
  gimnasio: "Gimnasio",
  box_crossfit: "Box / CrossFit",
  club_deportivo: "Club deportivo",
  fisioterapia: "Fisioterapia",
  farmacia: "Farmacia / parafarmacia",
  tienda_deporte: "Tienda de deporte",
  herbolario: "Herbolario",
  empresa: "Empresa",
  otro: "Otro",
};

export const ROLES = ["admin", "comercial"] as const;
export type Rol = (typeof ROLES)[number];
export const ROL_LABELS: Record<Rol, string> = { admin: "Admin", comercial: "Comercial" };

export const ORIGENES = ["lista", "anuncio", "manual"] as const;
export type Origen = (typeof ORIGENES)[number];
export const ORIGEN_LABELS: Record<Origen, string> = {
  lista: "Lista",
  anuncio: "Anuncio",
  manual: "Alta manual",
};

export const ESTADOS_MARCA = ["activa", "pausada", "finalizada"] as const;
export type EstadoMarca = (typeof ESTADOS_MARCA)[number];

/* -------------------------------------------------------------------------- */
/* Reglas de llamada                                                          */
/* -------------------------------------------------------------------------- */

const RANGO_ACTIVO: Record<string, number> = { nuevo: 0, contactado: 1, interesado: 2, muestras: 3 };

const DESTINO_LLAMADA: Record<ResultadoLlamada, Fase> = {
  no_contesta: "contactado",
  volver_a_llamar: "contactado",
  interesado: "interesado",
  pide_muestras: "interesado",
  no_interesa: "no_interesa",
  numero_erroneo: "ilocalizable",
};

/**
 * Fase en la que queda un lead tras una llamada. Dentro de las fases activas
 * solo se avanza (una llamada rutinaria no devuelve a «contactado» a quien ya
 * tiene muestras); los resultados negativos cierran el lead; un lead cerrado
 * que vuelve a interesarse se reactiva; un cliente no cambia por una llamada.
 * La fase «muestras» no la pone una llamada: la marca el botón Muestras enviadas.
 */
export function faseTrasLlamada(actual: Fase, resultado: ResultadoLlamada): Fase {
  if (actual === "cliente") return "cliente";
  const destino = DESTINO_LLAMADA[resultado];
  if (!esFaseActiva(destino)) return destino;
  if (!esFaseActiva(actual)) return destino;
  return RANGO_ACTIVO[destino] > RANGO_ACTIVO[actual] ? destino : actual;
}

/** Un resultado que cierra el lead no deja seguimiento pendiente. */
export function seguimientoTrasLlamada(
  resultado: ResultadoLlamada,
  fecha: string | null,
): string | null {
  return resultado === "no_interesa" || resultado === "numero_erroneo" ? null : fecha;
}

/* -------------------------------------------------------------------------- */
/* Normalización (idéntica a las columnas *_norm de la base de datos)         */
/* -------------------------------------------------------------------------- */

export function normalizarEmail(raw?: string | null): string | null {
  const email = (raw ?? "").trim().toLowerCase();
  return email || null;
}

/** Últimos 9 dígitos: «+34 600 11 22 33» y «600112233» son el mismo teléfono.
 *  Con menos de 6 dígitos no es un teléfono, es ruido. */
export function normalizarTelefono(raw?: string | null): string | null {
  const digitos = (raw ?? "").replace(/\D/g, "");
  return digitos.length >= 6 ? digitos.slice(-9) : null;
}

export function normalizarCif(raw?: string | null): string | null {
  const cif = (raw ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return cif || null;
}

const SINONIMOS_TIPO: Record<string, TipoNegocio> = {
  gym: "gimnasio",
  gimnasios: "gimnasio",
  crossfit: "box_crossfit",
  box: "box_crossfit",
  club: "club_deportivo",
  fisio: "fisioterapia",
  fisioterapeuta: "fisioterapia",
  farmacia: "farmacia",
  parafarmacia: "farmacia",
  tiendadedeportes: "tienda_deporte",
  tienda: "tienda_deporte",
  herboristeria: "herbolario",
};

const ALIAS_TIPO: Record<string, TipoNegocio> = (() => {
  const mapa: Record<string, TipoNegocio> = { ...SINONIMOS_TIPO };
  for (const tipo of TIPOS_NEGOCIO) {
    mapa[normalizeKey(tipo)] = tipo;
    mapa[normalizeKey(TIPO_NEGOCIO_LABELS[tipo])] = tipo;
  }
  return mapa;
})();

export function parseTipoNegocio(raw: string): TipoNegocio | null {
  const clave = normalizeKey(raw);
  if (!clave) return null;
  return ALIAS_TIPO[clave] ?? null;
}

export function slugify(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
