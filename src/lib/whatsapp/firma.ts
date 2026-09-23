import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifica la cabecera `X-Hub-Signature-256` de Meta contra el cuerpo CRUDO.
 * La comparación es en tiempo constante: comparar hashes con `===` filtra
 * información por el tiempo de respuesta.
 */
export function verificarFirmaMeta(
  appSecret: string,
  cabecera: string | null,
  cuerpoCrudo: string,
): boolean {
  if (!appSecret || !cabecera?.startsWith("sha256=")) return false;
  const recibida = cabecera.slice("sha256=".length);
  if (!/^[0-9a-f]+$/i.test(recibida)) return false;

  const esperada = createHmac("sha256", appSecret).update(cuerpoCrudo).digest("hex");
  const a = Buffer.from(recibida, "hex");
  const b = Buffer.from(esperada, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
