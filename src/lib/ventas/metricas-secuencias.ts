/**
 * Resultados por secuencia, para comparar variantes (A/B) en la lista de
 * secuencias. Puro: recibe las conversaciones y las fases de sus leads ya
 * leídas.
 *
 * Una conversación cuenta para la secuencia que la arrancó (`secuencia_id`
 * no se borra al pasar a una persona). Lo que se mide:
 *
 * - `empezaron`: conversaciones que arrancó.
 * - `terminaronQuiz`: contestaron la última pregunta del chequeo
 *   (`quiz_temperatura`). Solo tiene sentido en las secuencias de quiz: en las
 *   demás es 0 y la lista no lo enseña.
 * - `conComercial`: la conversación ya la lleva una persona (pidió llamada,
 *   escribió fuera del guion…). Es la medida de «respuesta» que importa.
 * - `clientes`: su lead está hoy en la fase `cliente`.
 */

import { claveQuiz, notaQuiz } from "./quiz";

export interface ConversacionMedida {
  secuencia_id: string | null;
  estado: "bot" | "humana" | "cerrada";
  lead_id: string | null;
  datos: Record<string, string> | null;
}

export interface ResultadoSecuencia {
  empezaron: number;
  terminaronQuiz: number;
  conComercial: number;
  clientes: number;
  /** Nota media del chequeo entre quienes lo terminaron; `null` si nadie. */
  notaMedia: number | null;
}

export function resultadosPorSecuencia(
  conversaciones: ConversacionMedida[],
  faseDeLead: Map<string, string>,
): Map<string, ResultadoSecuencia> {
  const resultados = new Map<string, ResultadoSecuencia & { sumaNotas: number; conNota: number }>();
  for (const c of conversaciones) {
    if (!c.secuencia_id) continue;
    let r = resultados.get(c.secuencia_id);
    if (!r) {
      r = { empezaron: 0, terminaronQuiz: 0, conComercial: 0, clientes: 0, notaMedia: null, sumaNotas: 0, conNota: 0 };
      resultados.set(c.secuencia_id, r);
    }
    const datos = c.datos ?? {};
    r.empezaron += 1;
    if (datos[claveQuiz("quiz_temperatura")]) r.terminaronQuiz += 1;
    const nota = notaQuiz(datos);
    if (nota !== null) {
      r.sumaNotas += nota;
      r.conNota += 1;
    }
    if (c.estado !== "bot") r.conComercial += 1;
    if (c.lead_id && faseDeLead.get(c.lead_id) === "cliente") r.clientes += 1;
  }

  const limpio = new Map<string, ResultadoSecuencia>();
  for (const [id, { sumaNotas, conNota, ...r }] of resultados) {
    limpio.set(id, { ...r, notaMedia: conNota > 0 ? Math.round(sumaNotas / conNota) : null });
  }
  return limpio;
}

/** «12 (40 %)»: el número y su porcentaje sobre las que empezaron. */
export function conPorcentaje(n: number, total: number): string {
  return total > 0 ? `${n} (${Math.round((n / total) * 100)} %)` : String(n);
}
