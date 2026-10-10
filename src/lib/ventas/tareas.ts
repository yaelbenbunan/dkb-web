/**
 * Tareas del módulo de ventas: las automáticas, que se deducen del estado de
 * cada lead, y las manuales (tabla `ventas_tareas`). Puro: recibe filas ya
 * leídas, así se prueba sin base de datos.
 */

import { esFaseActiva, type Fase } from "./dominio";
import type { Ahora } from "./metricas";
import { vencimiento } from "./tablero";

export type TipoTarea = "llamar" | "enviar_muestras" | "manual";
export type SeccionTarea = "atrasadas" | "hoy" | "proximas" | "sin_fecha";

export interface TareaVista {
  clave: string;
  tipo: TipoTarea;
  titulo: string;
  leadId: string | null;
  negocio: string | null;
  fecha: string | null;
  hora: string | null;
  asignadaA: string | null;
  tareaId: string | null;
  hecha: boolean;
}

export interface TareaManual {
  id: string;
  marca_id: string;
  lead_id: string | null;
  titulo: string;
  vence: string | null;
  vence_hora: string | null;
  asignada_a: string | null;
  creada_por: string | null;
  hecha_at: string | null;
  hecha_por: string | null;
  created_at: string;
}

export interface LeadDeTarea {
  id: string;
  negocio: string;
  fase: Fase;
  asignada_a: string | null;
  proximo_seguimiento: string | null;
  proximo_seguimiento_hora: string | null;
}

const hhmm = (hora: string | null) => (hora ? hora.slice(0, 5) : null);

/** Leads cuya última llamada terminó en «pide muestras». Las llamadas llegan de la más antigua a la más reciente. */
export function leadsQuePidenMuestras(llamadas: { lead_id: string; resultado: string | null }[]): Set<string> {
  const ultimo = new Map<string, string | null>();
  for (const l of llamadas) ultimo.set(l.lead_id, l.resultado);
  return new Set([...ultimo].filter(([, r]) => r === "pide_muestras").map(([id]) => id));
}

export function tareasAutomaticas(leads: LeadDeTarea[], pidenMuestras: Set<string>): TareaVista[] {
  const tareas: TareaVista[] = [];
  for (const l of leads) {
    const comun = { leadId: l.id, negocio: l.negocio, asignadaA: l.asignada_a, tareaId: null, hecha: false };
    if (esFaseActiva(l.fase) && l.proximo_seguimiento) {
      tareas.push({ ...comun, clave: `llamar:${l.id}`, tipo: "llamar", titulo: `Llamar a ${l.negocio}`, fecha: l.proximo_seguimiento, hora: hhmm(l.proximo_seguimiento_hora) });
    }
    if (l.fase === "interesado" && pidenMuestras.has(l.id)) {
      tareas.push({ ...comun, clave: `muestras:${l.id}`, tipo: "enviar_muestras", titulo: `Enviar muestras a ${l.negocio}`, fecha: null, hora: null });
    }
  }
  return tareas;
}

/** Leads nuevos a los que nadie ha puesto fecha: se enseñan como contador, no uno a uno. */
export function contarPrimerContacto(leads: LeadDeTarea[]): number {
  return leads.filter((l) => l.fase === "nuevo" && !l.proximo_seguimiento).length;
}

export function tareasManuales(tareas: TareaManual[], negocios: Map<string, string>): TareaVista[] {
  return tareas.map((t) => ({
    clave: `manual:${t.id}`,
    tipo: "manual",
    titulo: t.titulo,
    leadId: t.lead_id,
    negocio: t.lead_id ? (negocios.get(t.lead_id) ?? null) : null,
    fecha: t.vence,
    hora: hhmm(t.vence_hora),
    asignadaA: t.asignada_a,
    tareaId: t.id,
    hecha: t.hecha_at !== null,
  }));
}

/** Pendientes repartidas por urgencia; dentro de cada grupo, por fecha y hora (sin hora, al final del día). */
export function agruparTareas(tareas: TareaVista[], ahora: Ahora): Record<SeccionTarea, TareaVista[]> {
  const grupos: Record<SeccionTarea, TareaVista[]> = { atrasadas: [], hoy: [], proximas: [], sin_fecha: [] };
  const seccion = { atrasado: "atrasadas", hoy: "hoy", futuro: "proximas" } as const;
  for (const t of tareas) {
    if (t.hecha) continue;
    const v = vencimiento(t.fecha, t.hora, ahora);
    grupos[v ? seccion[v] : "sin_fecha"].push(t);
  }
  const orden = (t: TareaVista) => `${t.fecha ?? "9999-12-31"}T${t.hora ?? "99:99"}`;
  for (const lista of Object.values(grupos)) lista.sort((a, b) => orden(a).localeCompare(orden(b)));
  return grupos;
}
