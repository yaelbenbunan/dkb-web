import { describe, expect, test } from "vitest";
import {
  DEFAULT_SENDER_NAME,
  MAX_SENDER_NAME_LENGTH,
  formatFromHeader,
  isValidSenderName,
  sanitizeSenderName,
} from "../email-from";

describe("sanitizeSenderName", () => {
  test("deja pasar un nombre normal, con acentos y espacios", () => {
    expect(sanitizeSenderName("  Alicia de dinkbit  ")).toBe("Alicia de dinkbit");
    expect(sanitizeSenderName("Álvaro Muñoz")).toBe("Álvaro Muñoz");
  });

  test("quita saltos de línea y retornos de carro (inyección de cabeceras)", () => {
    expect(sanitizeSenderName("Alicia\r\nBcc: espia@evil.com")).toBe("Alicia Bcc: espia@evil.com");
    expect(sanitizeSenderName("Alicia\nX-Header: 1")).not.toContain("\n");
  });

  test("quita comillas, barra invertida y los delimitadores de dirección", () => {
    expect(sanitizeSenderName('Ali"cia\\ <otro@evil.com>')).toBe("Alicia otro@evil.com");
  });

  test("recorta al máximo de longitud", () => {
    expect(sanitizeSenderName("a".repeat(200))).toHaveLength(MAX_SENDER_NAME_LENGTH);
  });

  test("un nombre que se queda en nada devuelve cadena vacía", () => {
    expect(sanitizeSenderName('   ""   ')).toBe("");
    expect(sanitizeSenderName(null)).toBe("");
    expect(sanitizeSenderName(undefined)).toBe("");
  });
});

describe("isValidSenderName", () => {
  test("acepta vacío (se usará el nombre por defecto) y nombres limpios", () => {
    expect(isValidSenderName("")).toBe(true);
    expect(isValidSenderName("Alicia de dinkbit")).toBe(true);
  });
  test("avisa cuando el nombre perdería caracteres", () => {
    expect(isValidSenderName('Alicia "la jefa"')).toBe(false);
    expect(isValidSenderName("Alicia\r\nBcc: x@y.com")).toBe(false);
  });
});

describe("formatFromHeader", () => {
  test("compone «Nombre» <email>", () => {
    expect(formatFromHeader("Alicia de dinkbit", "hola@dinkbit.es")).toBe(
      '"Alicia de dinkbit" <hola@dinkbit.es>',
    );
  });

  test("sin nombre cae en el valor por defecto", () => {
    expect(formatFromHeader("", "hola@dinkbit.es")).toBe(`"${DEFAULT_SENDER_NAME}" <hola@dinkbit.es>`);
    expect(formatFromHeader(null, "hola@dinkbit.es")).toBe(`"${DEFAULT_SENDER_NAME}" <hola@dinkbit.es>`);
  });

  test("la cabecera nunca sale partida aunque el nombre traiga saltos", () => {
    const header = formatFromHeader("Alicia\r\nBcc: espia@evil.com", "hola@dinkbit.es");
    expect(header).not.toMatch(/[\r\n]/);
    expect(header.endsWith("<hola@dinkbit.es>")).toBe(true);
  });

  test("una coma en el nombre no parte la lista de direcciones: va entrecomillada", () => {
    expect(formatFromHeader("dinkbit, agencia", "hola@dinkbit.es")).toBe(
      '"dinkbit, agencia" <hola@dinkbit.es>',
    );
  });
});
