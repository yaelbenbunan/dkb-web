import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Cifrado AES-256-GCM de los tokens de Meta de cada marca antes de guardarlos
// en la base de datos. Formato: v1:<iv>:<tag>:<datos> (base64url).

const VERSION = "v1";
const BYTES_IV = 12;

/** Decodifica la clave base64 y exige 32 bytes. Nunca incluye la clave en el error. */
function clave(claveB64: string): Buffer {
  const k = Buffer.from(claveB64, "base64");
  if (k.length !== 32) throw new Error("WHATSAPP_CLAVE_TOKENS debe tener 32 bytes");
  return k;
}

/** El AAD liga el texto cifrado a su marca: copiarlo a otra fila no lo descifra. */
function aad(marcaId: string): Buffer {
  return Buffer.from(`${VERSION}:${marcaId}`, "utf8");
}

export function cifrarToken(token: string, claveB64: string, marcaId: string): string {
  const k = clave(claveB64);
  const iv = randomBytes(BYTES_IV);
  const cifrador = createCipheriv("aes-256-gcm", k, iv, { authTagLength: 16 });
  cifrador.setAAD(aad(marcaId));
  const datos = Buffer.concat([cifrador.update(token, "utf8"), cifrador.final()]);
  const tag = cifrador.getAuthTag();
  return [VERSION, iv, tag, datos].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(":");
}

export function descifrarToken(cifrado: string, claveB64: string, marcaId: string): string {
  const k = clave(claveB64);
  const partes = cifrado.split(":");
  if (partes.length !== 4 || partes[0] !== VERSION) {
    throw new Error("Formato de token cifrado no válido");
  }
  const iv = Buffer.from(partes[1], "base64url");
  const tag = Buffer.from(partes[2], "base64url");
  const datos = Buffer.from(partes[3], "base64url");
  if (iv.length !== BYTES_IV || tag.length !== 16) throw new Error("Formato de token cifrado no válido");
  const descifrador = createDecipheriv("aes-256-gcm", k, iv, { authTagLength: 16 });
  descifrador.setAAD(aad(marcaId));
  descifrador.setAuthTag(tag);
  // final() lanza si la etiqueta no cuadra (datos alterados o clave distinta).
  return Buffer.concat([descifrador.update(datos), descifrador.final()]).toString("utf8");
}

/** Clave de cifrado del entorno, o null si no está configurada. */
export function claveDeEntorno(): string | null {
  return process.env.WHATSAPP_CLAVE_TOKENS || null;
}
