/**
 * Destinatarios del aviso interno de "nuevo lead" (`CONTACT_EMAIL_TO`).
 *
 * Antes cada action pasaba la variable de entorno tal cual a
 * `resend.emails.send({ to })`, así que solo cabía una dirección: dos
 * direcciones separadas por coma llegaban a Resend como una cadena rara en
 * vez de como dos destinatarios. Este helper parte esa cadena, la limpia y
 * la deja lista para el array que Resend sí acepta en `to`, así que ahora se
 * puede avisar a varias personas cambiando solo la variable en Vercel, sin
 * tocar código.
 *
 * Es un módulo puro (sin `server-only`): no toca red ni entorno de servidor,
 * así que se puede testear e importar desde cualquier sitio sin mocks.
 */

// Regex de email deliberadamente simple: solo sirve para descartar entradas
// que a todas luces no son un correo (texto suelto, campos vacíos, un "@"
// perdido). No pretende validar RFC 5322 completo.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Convierte el valor de `CONTACT_EMAIL_TO` en la lista de direcciones a
 * avisar. Acepta comas y/o puntos y coma como separador, recorta espacios,
 * descarta entradas vacías o que no parecen un email, y elimina duplicados
 * sin distinguir mayúsculas de minúsculas (se queda con la primera
 * aparición, tal cual estaba escrita).
 *
 * El orden de entrada se conserva en la salida: el primero de la lista sigue
 * siendo el primero. `raw` vacío, solo separadores, o nulo/indefinido
 * devuelven `[]`.
 */
export function destinatariosAviso(raw?: string | null): string[] {
  if (!raw) return [];

  const vistos = new Set<string>();
  const resultado: string[] = [];

  for (const trozo of raw.split(/[,;]/)) {
    const direccion = trozo.trim();
    if (!direccion) continue;
    if (!EMAIL_RE.test(direccion)) continue;

    const clave = direccion.toLowerCase();
    if (vistos.has(clave)) continue;

    vistos.add(clave);
    resultado.push(direccion);
  }

  return resultado;
}
