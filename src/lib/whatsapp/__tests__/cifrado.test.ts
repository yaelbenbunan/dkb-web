import { describe, expect, it, afterEach } from "vitest";
import { randomBytes } from "node:crypto";
import { cifrarToken, claveDeEntorno, descifrarToken } from "../cifrado";

const CLAVE = randomBytes(32).toString("base64");
const MARCA = "marca-a";
const TOKEN = "EAAG-token-de-prueba";

describe("cifrarToken / descifrarToken", () => {
  it("ida y vuelta devuelve el original", () => {
    expect(descifrarToken(cifrarToken(TOKEN, CLAVE, MARCA), CLAVE, MARCA)).toBe(TOKEN);
  });

  it("dos cifrados del mismo token difieren", () => {
    expect(cifrarToken(TOKEN, CLAVE, MARCA)).not.toBe(cifrarToken(TOKEN, CLAVE, MARCA));
  });

  it("usa el formato v1:<iv>:<tag>:<datos>", () => {
    const partes = cifrarToken(TOKEN, CLAVE, MARCA).split(":");
    expect(partes).toHaveLength(4);
    expect(partes[0]).toBe("v1");
  });

  it("lanza si se altera un carácter de los datos", () => {
    const partes = cifrarToken(TOKEN, CLAVE, MARCA).split(":");
    const datos = partes[3];
    partes[3] = (datos[0] === "A" ? "B" : "A") + datos.slice(1);
    expect(() => descifrarToken(partes.join(":"), CLAVE, MARCA)).toThrow();
  });

  it("lanza con otra clave", () => {
    const otra = randomBytes(32).toString("base64");
    expect(() => descifrarToken(cifrarToken(TOKEN, CLAVE, MARCA), otra, MARCA)).toThrow();
  });

  it("lanza si la etiqueta GCM se trunca a 4 bytes", () => {
    const partes = cifrarToken(TOKEN, CLAVE, MARCA).split(":");
    partes[2] = Buffer.from(partes[2], "base64url").subarray(0, 4).toString("base64url");
    expect(() => descifrarToken(partes.join(":"), CLAVE, MARCA)).toThrow("Formato de token cifrado no válido");
  });

  it("lo cifrado para una marca no se descifra con otra", () => {
    const c = cifrarToken(TOKEN, CLAVE, "a");
    expect(() => descifrarToken(c, CLAVE, "b")).toThrow();
    expect(descifrarToken(c, CLAVE, "a")).toBe(TOKEN);
  });

  it("lanza si el formato no es v1", () => {
    const c = cifrarToken(TOKEN, CLAVE, MARCA).replace(/^v1:/, "v2:");
    expect(() => descifrarToken(c, CLAVE, MARCA)).toThrow();
  });

  it("lanza si la clave no mide 32 bytes", () => {
    const corta = randomBytes(16).toString("base64");
    expect(() => cifrarToken(TOKEN, corta, MARCA)).toThrow("WHATSAPP_CLAVE_TOKENS debe tener 32 bytes");
    expect(() => descifrarToken(cifrarToken(TOKEN, CLAVE, MARCA), corta, MARCA)).toThrow(
      "WHATSAPP_CLAVE_TOKENS debe tener 32 bytes",
    );
  });
});

describe("claveDeEntorno", () => {
  const original = process.env.WHATSAPP_CLAVE_TOKENS;
  afterEach(() => {
    if (original === undefined) delete process.env.WHATSAPP_CLAVE_TOKENS;
    else process.env.WHATSAPP_CLAVE_TOKENS = original;
  });

  it("devuelve null si falta", () => {
    delete process.env.WHATSAPP_CLAVE_TOKENS;
    expect(claveDeEntorno()).toBeNull();
  });

  it("devuelve el valor si existe", () => {
    process.env.WHATSAPP_CLAVE_TOKENS = CLAVE;
    expect(claveDeEntorno()).toBe(CLAVE);
  });
});
