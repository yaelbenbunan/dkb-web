/**
 * Sufijo único dentro del proceso.
 *
 * Antes eran cuatro caracteres al azar sobre 65.536 valores. Como el prefijo
 * es la marca de tiempo, dos identificadores creados en el mismo milisegundo
 * dependían solo de ese azar, y por la paradoja del cumpleaños chocaban con
 * bastante más frecuencia de lo que parece: generando 50 seguidos, ~1 de cada
 * 54 veces. Eso ponía la suite en rojo sin motivo.
 *
 * Ahora es un contador monótono, que no puede repetirse hasta dar la vuelta
 * (36^4 = 1.679.616 identificadores). Arranca en un punto aleatorio para que
 * los ids no queden en secuencia adivinable entre reinicios.
 */
const VUELTA = 36 ** 4;
let contador = Math.floor(Math.random() * VUELTA);

function sufijo4(): string {
  contador = (contador + 1) % VUELTA;
  return contador.toString(36).padStart(4, "0").slice(-4);
}

export function generateLeadId(): string {
  const ts = Date.now().toString(36);
  return `${ts}-${sufijo4()}`;
}

export function isLeadIdShape(v: unknown): v is string {
  return typeof v === "string" && /^[a-z0-9]{4,}-[a-z0-9]{4}$/.test(v);
}
