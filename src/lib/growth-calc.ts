/**
 * Cálculo del coste por paciente de la calculadora de /growth.
 *
 * Módulo puro a propósito: nada de React, nada de red. Es la pieza con más
 * riesgo de bug silencioso (divisiones por cero, NaN en pantalla, formatos de
 * número españoles) y así se puede testear sola.
 */

export type Rama = "A" | "B" | "C";

export interface CalcInput {
  /** null = "no invierto todavía". */
  inversion: number | null;
  /** null = "no lo sé". */
  pacientes: number | null;
  /** null = no lo quiso decir. */
  ticket: number | null;
}

export interface CalcResult {
  rama: Rama;
  costePorPaciente: number | null;
  generado: number | null;
  retorno: number | null;
  /** Invierte pero no le llega ningún paciente: mensaje propio dentro de la rama B. */
  sinPacientes: boolean;
}

/**
 * Normaliza un importe escrito a mano. Acepta formato español ("1.500,50"),
 * inglés ("1500.50"), con símbolos y con espacios.
 *
 * Regla para desambiguar el punto: si el último grupo tras un punto tiene
 * exactamente tres dígitos, es separador de miles; si no, es decimal. Eso
 * resuelve bien "1.500" (1500) y "1500.50" (1500,5). El caso "1.234" se
 * interpreta como 1234, que es lo correcto para importes en euros.
 */
export function parseImporte(raw: string): number | null {
  const limpio = (raw ?? "").replace(/[^\d.,-]/g, "");
  if (!limpio || !/\d/.test(limpio)) return null;
  const negativo = limpio.trimStart().startsWith("-");
  let s = limpio.replace(/-/g, "");

  if (s.includes(",")) {
    // La coma manda como decimal; los puntos son miles.
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    const grupos = s.split(".");
    const ultimo = grupos.length > 1 ? grupos[grupos.length - 1] : "";
    if (grupos.length > 1 && ultimo.length === 3) s = grupos.join("");
  }

  const n = Number.parseFloat(s);
  if (!Number.isFinite(n)) return null;
  // Un importe negativo produciría un coste por paciente negativo en pantalla:
  // se trata como no informado.
  if (negativo || n < 0) return null;
  return n;
}

/** Redondeo a dos decimales, para que los tests sean deterministas y no salga
 *  "88.23529411764706" en pantalla. */
function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Decide la rama del resultado y calcula lo que se pueda con lo que hay.
 *
 * Las tres ramas son discursos distintos, no grados del mismo:
 *   A: sabe sus números → se le da su coste por paciente.
 *   B: no sabe cuántos pacientes le llegan → "no se puede calcular, y eso es
 *      el hallazgo". Por volumen será la mayoritaria.
 *   C: no invierte todavía → crear demanda, no arreglar medición.
 */
export function calcular(input: CalcInput): CalcResult {
  const { inversion, pacientes, ticket } = input;
  const invierte = inversion !== null && inversion > 0;
  const sabePacientes = pacientes !== null;
  const sinPacientes = invierte && pacientes === 0;

  const generado =
    sabePacientes && pacientes > 0 && ticket !== null && ticket > 0
      ? redondear(pacientes * ticket)
      : null;

  if (!invierte) {
    return { rama: "C", costePorPaciente: null, generado, retorno: null, sinPacientes: false };
  }

  if (!sabePacientes || pacientes === 0) {
    return { rama: "B", costePorPaciente: null, generado: null, retorno: null, sinPacientes };
  }

  return {
    rama: "A",
    costePorPaciente: redondear((inversion as number) / pacientes),
    generado,
    retorno: generado !== null ? redondear(generado / (inversion as number)) : null,
    sinPacientes: false,
  };
}

/** Euros en español: 88.24 → "88,24 €". Vive aquí y no en cada consumidor
 *  porque lo usan tanto el email de seguimiento como el wizard. */
export function formatEur(n: number): string {
  return `${n.toFixed(2).replace(".", ",")} €`;
}
