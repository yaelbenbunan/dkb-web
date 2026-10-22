/**
 * Firmas de subida pendientes de cada alta (`alta_clientes.subidas_pendientes`).
 *
 * El servidor firma una subida ANTES de que exista el archivo, así que el
 * bucket solo no basta para el tope de 40 archivos / 1 GB: con muchas firmas
 * a la vez se podría pasar. Cada firma se apunta aquí hasta que el navegador
 * confirma la subida o caduca la URL (2 h), y cuenta como un archivo de 50 MB
 * (el máximo: no nos fiamos del tamaño que declara el navegador). Las
 * entradas de los últimos 10 minutos sirven además de límite de ritmo.
 * Puro: sin red ni entorno.
 */

import { ERROR_CUPO, MAX_ARCHIVOS_ALTA, MAX_BYTES_ALTA, MAX_BYTES_ARCHIVO } from "./archivos";

/** Lo que dura una URL de subida firmada de Supabase. */
export const TTL_FIRMA_MS = 2 * 60 * 60 * 1000;
export const VENTANA_FIRMAS_MS = 10 * 60 * 1000;
export const FIRMAS_POR_VENTANA = 15;

export const ERROR_RITMO = "Demasiados archivos seguidos. Espera unos minutos y vuelve a intentarlo.";

export interface FirmaPendiente {
  ruta: string;
  firmada: string;
  expira: string;
  /** Ya confirmada: deja de contar como pendiente (el archivo está en el bucket). */
  subida?: boolean;
}

/** null = la columna no existe (falta la migración); [] = vacía. */
export function leerPendientes(raw: unknown): FirmaPendiente[] | null {
  if (raw === undefined) return null;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (p): p is FirmaPendiente =>
      !!p &&
      typeof p === "object" &&
      typeof p.ruta === "string" &&
      typeof p.firmada === "string" &&
      typeof p.expira === "string" &&
      !Number.isNaN(Date.parse(p.firmada)) &&
      !Number.isNaN(Date.parse(p.expira)),
  );
}

const estaPendiente = (p: FirmaPendiente, ahora: number) => !p.subida && Date.parse(p.expira) > ahora;
const enLaVentana = (p: FirmaPendiente, ahora: number) => ahora - Date.parse(p.firmada) < VENTANA_FIRMAS_MS;

/** Fuera lo que ya no cuenta para nada: caducadas y subidas fuera de la ventana. */
function limpiar(lista: FirmaPendiente[], ahora: number): FirmaPendiente[] {
  return lista.filter((p) => estaPendiente(p, ahora) || enLaVentana(p, ahora));
}

export type Reserva = { ok: true; pendientes: FirmaPendiente[] } | { ok: false; error: string };

/** ¿Se puede firmar una subida más? `uso`: lo que ya hay en el bucket. */
export function reservarFirma(lista: FirmaPendiente[], uso: { archivos: number; bytes: number }, ruta: string, fecha: Date = new Date()): Reserva {
  const ahora = fecha.getTime();
  const vigentes = limpiar(lista, ahora);
  if (vigentes.filter((p) => enLaVentana(p, ahora)).length >= FIRMAS_POR_VENTANA) return { ok: false, error: ERROR_RITMO };
  const pendientes = vigentes.filter((p) => estaPendiente(p, ahora)).length + 1;
  if (uso.archivos + pendientes > MAX_ARCHIVOS_ALTA || uso.bytes + pendientes * MAX_BYTES_ARCHIVO > MAX_BYTES_ALTA) {
    return { ok: false, error: ERROR_CUPO };
  }
  return { ok: true, pendientes: [...vigentes, { ruta, firmada: fecha.toISOString(), expira: new Date(ahora + TTL_FIRMA_MS).toISOString() }] };
}

/** Subida confirmada, enviada o quitada: deja de estar pendiente. */
export function marcarSubidas(lista: FirmaPendiente[], rutas: string[], fecha: Date = new Date()): FirmaPendiente[] {
  const marcar = new Set(rutas);
  return limpiar(lista, fecha.getTime()).map((p) => (marcar.has(p.ruta) && !p.subida ? { ...p, subida: true } : p));
}
