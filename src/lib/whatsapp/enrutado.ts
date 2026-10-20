/**
 * Decide a qué marca pertenece un mensaje entrante según el número que lo
 * recibió. Puro: sin base de datos, para poder probarlo sin mocks.
 *
 * - "asignada": hay una marca con ese número conectado (gana siempre).
 * - "dinkbit": no hay marca asignada y el número es el de entorno, o no se
 *   conoce el número (comportamiento anterior a la coexistencia).
 * - "desconocida": número ajeno sin marca; no se debe atribuir a nadie.
 */
export function elegirMarca(i: {
  numeroId: string | null;
  numeroEntorno: string | null;
  asignada: { id: string } | null;
}): "asignada" | "dinkbit" | "desconocida" {
  if (i.asignada) return "asignada";
  if (i.numeroId === null || i.numeroId === i.numeroEntorno) return "dinkbit";
  return "desconocida";
}
