/**
 * Borrador del formulario de alta en el navegador del cliente (localStorage,
 * una clave por token), para que una recarga o un cierre sin querer no le
 * haga perder lo escrito. Comodidad, no fuente de verdad: lo que cuenta es lo
 * enviado. Cada acceso al almacenamiento va en try/catch: en modo privado o
 * con el almacenamiento bloqueado o lleno, el formulario funciona igual.
 */

import type { NombreCampoArchivo } from "./archivos";

const VERSION = 1;
const PREFIJO = "dinkbit-alta-borrador:";

export interface ArchivoBorrador {
  campo: NombreCampoArchivo;
  ruta: string;
  nombre: string;
  tamano: number;
}

export interface Borrador {
  valores: Record<string, unknown>;
  archivos: ArchivoBorrador[];
}

export function claveBorrador(token: string): string {
  return `${PREFIJO}${token}`;
}

export function guardarBorrador(token: string, b: Borrador, ahora: Date = new Date()): void {
  try {
    localStorage.setItem(claveBorrador(token), JSON.stringify({ v: VERSION, guardado: ahora.toISOString(), ...b }));
  } catch {
    // Sin almacenamiento: no hay borrador, y ya está.
  }
}

/** El texto tal cual (estable entre lecturas, apto para useSyncExternalStore). */
export function leerBorradorCrudo(token: string): string | null {
  try {
    return localStorage.getItem(claveBorrador(token));
  } catch {
    return null;
  }
}

export function borrarBorrador(token: string): void {
  try {
    localStorage.removeItem(claveBorrador(token));
  } catch {
    // Nada que hacer.
  }
}

/** El borrador, si es válido y posterior al último envío (si no, manda lo enviado). */
export function interpretarBorrador(crudo: string | null, enviadaEn: string | null): Borrador | null {
  if (!crudo) return null;
  try {
    const b = JSON.parse(crudo) as { v?: unknown; guardado?: unknown; valores?: unknown; archivos?: unknown };
    if (b.v !== VERSION || typeof b.guardado !== "string") return null;
    if (!b.valores || typeof b.valores !== "object" || Array.isArray(b.valores) || !Array.isArray(b.archivos)) return null;
    if (enviadaEn && !(Date.parse(b.guardado) > Date.parse(enviadaEn))) return null;
    const archivos = b.archivos.filter(
      (a): a is ArchivoBorrador =>
        !!a && typeof a === "object" && typeof a.campo === "string" && typeof a.ruta === "string" && typeof a.nombre === "string" && typeof a.tamano === "number",
    );
    return { valores: b.valores as Record<string, unknown>, archivos };
  } catch {
    return null;
  }
}
