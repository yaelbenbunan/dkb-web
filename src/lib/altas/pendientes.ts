/**
 * Reservas de subida de cada alta (`alta_clientes.subidas_pendientes`).
 *
 * El servidor firma una subida ANTES de que exista el archivo, y la URL firmada
 * vale 2 h: el bucket solo no basta para el tope de 40 archivos / 1 GB. Cada
 * firma reserva un hueco de 50 MB (el máximo; no nos fiamos del tamaño que
 * declara el navegador) hasta que CADUCA. Nunca se libera por lo que diga el
 * cliente: con la URL aún válida podría subir después. Solo deja de contar a
 * 50 MB cuando su ruta aparece en el listado del bucket, y entonces cuenta por
 * su tamaño real (no dos veces). Las firmas de los últimos 10 minutos sirven
 * además de límite de ritmo. Puro: sin red ni entorno.
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
}

/** Lo que hay de verdad en el bucket del alta. */
export interface UsoBucket {
  archivos: number;
  bytes: number;
  rutas: readonly string[];
}

/** null = la columna no existe (falta la migración); [] = vacía. */
export function leerPendientes(raw: unknown): FirmaPendiente[] | null {
  if (raw === undefined) return null;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (p): p is FirmaPendiente =>
        !!p &&
        typeof p === "object" &&
        typeof p.ruta === "string" &&
        typeof p.firmada === "string" &&
        typeof p.expira === "string" &&
        !Number.isNaN(Date.parse(p.firmada)) &&
        !Number.isNaN(Date.parse(p.expira)),
    )
    .map(({ ruta, firmada, expira }) => ({ ruta, firmada, expira }));
}

export type Reserva = { ok: true; pendientes: FirmaPendiente[] } | { ok: false; error: string };

/** ¿Se puede firmar una subida más? */
export function reservarFirma(lista: FirmaPendiente[], uso: UsoBucket, ruta: string, fecha: Date = new Date()): Reserva {
  const ahora = fecha.getTime();
  const enBucket = new Set(uso.rutas);
  const vigentes = lista.filter((p) => Date.parse(p.expira) > ahora);
  const enLaVentana = (p: FirmaPendiente) => ahora - Date.parse(p.firmada) < VENTANA_FIRMAS_MS;
  if (vigentes.filter(enLaVentana).length >= FIRMAS_POR_VENTANA) return { ok: false, error: ERROR_RITMO };
  const pendientes = vigentes.filter((p) => !enBucket.has(p.ruta)).length + 1;
  if (uso.archivos + pendientes > MAX_ARCHIVOS_ALTA || uso.bytes + pendientes * MAX_BYTES_ARCHIVO > MAX_BYTES_ALTA) {
    return { ok: false, error: ERROR_CUPO };
  }
  // Se guarda lo que aún cuenta para algo: lo no subido hasta que caduque y,
  // de lo ya subido, lo que sigue dentro de la ventana de ritmo.
  const guardar = vigentes.filter((p) => !enBucket.has(p.ruta) || enLaVentana(p));
  return { ok: true, pendientes: [...guardar, { ruta, firmada: fecha.toISOString(), expira: new Date(ahora + TTL_FIRMA_MS).toISOString() }] };
}
