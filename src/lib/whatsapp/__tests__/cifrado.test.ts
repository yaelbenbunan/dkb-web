import { describe, expect, it, afterEach } from "vitest";
import { randomBytes } from "node:crypto";
import { cifrarToken, claveDeEntorno, descifrarToken } from "../cifrado";

const CLAVE = randomBytes(32).toString("base64");
const TOKEN = "EAAG-token-de-prueba";

describe("cifrarToken / descifrarToken", () => {
  it("ida y vuelta devuelve el original", () => {
    expect(descifrarToken(cifrarToken(TOKEN, CLAVE), CLAVE)).toBe(TOKEN);
  });

  it("dos cifrados del mismo token difieren", () => {
    expect(cifrarToken(TOKEN, CLAVE)).not.toBe(cifrarToken(TOKEN, CLAVE));
  });

  it("usa el formato v1:<iv>:<tag>:<datos>", () => {
    const partes = cifrarToken(TOKEN, CLAVE).split(":");
    expect(partes).toHaveLength(4);
    expect(partes[0]).toBe("v1");
  });

  it("lanza si se altera un carácter de los datos", () => {
    const partes = cifrarToken(TOKEN, CLAVE).split(":");
    const datos = partes[3];
    partes[3] = (datos[0] === "A" ? "B" : "A") + datos.slice(1);
    expect(() => descifrarToken(partes.join(":"), CLAVE)).toThrow();
  });

  it("lanza con otra clave", () => {
    const otra = randomBytes(32).toString("base64");
    expect(() => descifrarToken(cifrarToken(TOKEN, CLAVE), otra)).toThrow();
  });

  it("lanza si el formato no es v1", () => {
    const c = cifrarToken(TOKEN, CLAVE).replace(/^v1:/, "v2:");
    expect(() => descifrarToken(c, CLAVE)).toThrow();
  });

  it("lanza si la clave no mide 32 bytes", () => {
    const corta = randomBytes(16).toString("base64");
    expect(() => cifrarToken(TOKEN, corta)).toThrow("WHATSAPP_CLAVE_TOKENS debe tener 32 bytes");
    expect(() => descifrarToken(cifrarToken(TOKEN, CLAVE), corta)).toThrow(
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
