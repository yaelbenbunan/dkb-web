/**
 * Campañas de email como módulo opcional por marca (unificación del CRM,
 * proyecto 2: docs/superpowers/specs/2026-10-16-ventas-campanas-design.md).
 *
 * Módulo puro: lo usan las páginas, las acciones, el envío y los tests.
 */
import { EMAIL_RE } from "./leads-csv";
import { MARCA_DINKBIT_SLUG } from "./dominio";
import type { Leido } from "./validacion";

/** Servicios opcionales que un admin enciende por marca (`ventas_marcas.modulos`). */
export const MODULO_CAMPANAS = "campanas";
export type Modulo = typeof MODULO_CAMPANAS;

/** Máximo de remitentes por marca: es una lista blanca, no una agenda. */
const MAX_REMITENTES = 10;

/**
 * Si la marca tiene encendido el módulo. Sin la migración la fila no trae
 * `modulos`: entonces dinkbit cuenta como encendido (ya mandaba campañas desde
 * /panel) y el resto, apagado.
 */
export function tieneModulo(marca: { slug: string; modulos?: string[] | null }, modulo: Modulo): boolean {
  if (!Array.isArray(marca.modulos)) return marca.slug === MARCA_DINKBIT_SLUG;
  return marca.modulos.includes(modulo);
}

/**
 * Si la campaña es de la marca. Las campañas sin marca son las de antes de
 * este proyecto, todas de dinkbit; nunca de otra marca, para que una marca
 * cliente no vea (ni mande) lo de dinkbit.
 */
export function campanaEsDeMarca(campana: { marca_id?: string | null }, marca: { id: string; slug: string }): boolean {
  if (campana.marca_id) return campana.marca_id === marca.id;
  return marca.slug === MARCA_DINKBIT_SLUG;
}

/** Remitentes permitidos de la marca; sin los suyos, la lista global (`CAMPAIGN_SENDERS`). */
export function remitentesDeMarca(marca: { campanas_remitentes?: string[] | null }, global: readonly string[]): string[] {
  const propios = (marca.campanas_remitentes ?? []).map((r) => r.trim().toLowerCase()).filter(Boolean);
  return propios.length ? propios : [...global];
}

export interface ModulosMarca {
  campanas: boolean;
  /** Vacío = la lista global. */
  remitentes: string[];
}

/** El formulario «Módulos» de Condiciones. */
export function leerModulos(fd: FormData): Leido<ModulosMarca> {
  const campanas = fd.get("campanas") === "on";
  const texto = String(fd.get("remitentes") ?? "");
  const remitentes = [...new Set(texto.split(/[,\n;]/).map((r) => r.trim().toLowerCase()).filter(Boolean))];
  const malo = remitentes.find((r) => !EMAIL_RE.test(r) || r.length > 120);
  if (malo) return { ok: false, error: `«${malo}» no es un email válido.` };
  if (remitentes.length > MAX_REMITENTES) return { ok: false, error: `Como mucho ${MAX_REMITENTES} remitentes.` };
  return { ok: true, datos: { campanas, remitentes } };
}

/** Los módulos de la marca tras encender o apagar uno, sin tocar los demás. */
export function conModulo(actuales: readonly string[] | null | undefined, modulo: Modulo, activo: boolean): string[] {
  const sin = (actuales ?? []).filter((m) => m !== modulo);
  return activo ? [...sin, modulo] : sin;
}
