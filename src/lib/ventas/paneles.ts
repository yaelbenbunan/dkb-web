import "server-only";
import { listActividadMarca, listCambiosFaseMarca, listLeads, type Marca } from "./db";
import { calcularEmbudo, esMes, mesDe, rangoConsultaMes, resumenMes, type Embudo, type ResumenMes } from "./metricas";

export interface DatosPanelMarca {
  marca: Marca;
  embudo: Embudo;
  resumen: ResumenMes;
}

export async function cargarPanelMarca(marca: Marca, mes: string, hoy: string): Promise<DatosPanelMarca> {
  const rango = rangoConsultaMes(mes);
  const [leads, actividad, cambios] = await Promise.all([
    listLeads(marca.id),
    listActividadMarca(marca.id, rango.desde, rango.hasta),
    listCambiosFaseMarca(marca.id),
  ]);
  return { marca, embudo: calcularEmbudo(leads, cambios), resumen: resumenMes(mes, leads, actividad, hoy) };
}

export function mesDeConsulta(raw: unknown, now: Date = new Date()): string {
  return esMes(raw) ? raw : mesDe(now.toISOString());
}
