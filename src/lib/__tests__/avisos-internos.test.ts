import { describe, expect, test } from "vitest";
import { destinatariosAviso } from "../avisos-internos";

describe("destinatariosAviso", () => {
  test("una sola dirección → un elemento", () => {
    expect(destinatariosAviso("hola@dinkbit.es")).toEqual(["hola@dinkbit.es"]);
  });

  test("varias direcciones separadas por comas, con espacios de sobra", () => {
    expect(
      destinatariosAviso(" hola@dinkbit.es ,  paula.garcia@dinkbit.com "),
    ).toEqual(["hola@dinkbit.es", "paula.garcia@dinkbit.com"]);
  });

  test("separadas por punto y coma", () => {
    expect(destinatariosAviso("hola@dinkbit.es;paula.garcia@dinkbit.com")).toEqual([
      "hola@dinkbit.es",
      "paula.garcia@dinkbit.com",
    ]);
  });

  test("comas y puntos y coma mezclados", () => {
    expect(
      destinatariosAviso("hola@dinkbit.es, paula.garcia@dinkbit.com; equipo@dinkbit.com"),
    ).toEqual(["hola@dinkbit.es", "paula.garcia@dinkbit.com", "equipo@dinkbit.com"]);
  });

  test("duplicadas con distinta caja: se queda con la primera aparición", () => {
    expect(
      destinatariosAviso("Hola@Dinkbit.es, hola@dinkbit.es, HOLA@DINKBIT.ES"),
    ).toEqual(["Hola@Dinkbit.es"]);
  });

  test("entradas basura mezcladas con válidas: descarta lo que no parece un email", () => {
    expect(
      destinatariosAviso("hola@dinkbit.es, no es un email, , paula.garcia@dinkbit.com, @sinusuario.com"),
    ).toEqual(["hola@dinkbit.es", "paula.garcia@dinkbit.com"]);
  });

  test("cadena vacía → []", () => {
    expect(destinatariosAviso("")).toEqual([]);
  });

  test("solo separadores y espacios → []", () => {
    expect(destinatariosAviso(" ; , ; ")).toEqual([]);
  });

  test("undefined → []", () => {
    expect(destinatariosAviso(undefined)).toEqual([]);
  });

  test("null → []", () => {
    expect(destinatariosAviso(null)).toEqual([]);
  });
});
