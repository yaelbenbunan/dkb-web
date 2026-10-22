/**
 * Token del enlace de alta (/alta/<token>). Es lo único que protege el
 * formulario de un cliente, así que tiene que ser imposible de adivinar:
 * 32 bytes aleatorios del generador criptográfico, en base64url (43
 * caracteres, sin relleno). Puro: lo usan el panel, la página pública y los tests.
 */

const LONGITUD_BYTES = 32;
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

function aBase64Url(bytes: Uint8Array): string {
  let binario = "";
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function generarTokenAlta(): string {
  const bytes = new Uint8Array(LONGITUD_BYTES);
  crypto.getRandomValues(bytes);
  return aBase64Url(bytes);
}

/** Filtro previo a la base: algo que ni siquiera tiene forma de token no se busca. */
export function esFormatoTokenAlta(valor: unknown): valor is string {
  return typeof valor === "string" && TOKEN_RE.test(valor);
}

export const ENLACE_ALTA_BASE = "https://www.dinkbit.es/alta";

export function enlaceAlta(token: string): string {
  return `${ENLACE_ALTA_BASE}/${token}`;
}
