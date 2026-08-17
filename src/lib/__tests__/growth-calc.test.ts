import { describe, expect, test } from "vitest";
import { parseImporte } from "../growth-calc";

describe("parseImporte", () => {
  test("número pelado", () => {
    expect(parseImporte("1500")).toBe(1500);
  });

  test("punto como separador de miles (formato español)", () => {
    expect(parseImporte("1.500")).toBe(1500);
    expect(parseImporte("1.500.000")).toBe(1500000);
  });

  test("coma como separador decimal", () => {
    expect(parseImporte("1500,50")).toBe(1500.5);
    expect(parseImporte("1.500,50")).toBe(1500.5);
  });

  test("punto como decimal cuando no son grupos de tres", () => {
    expect(parseImporte("1500.50")).toBe(1500.5);
    expect(parseImporte("0.5")).toBe(0.5);
  });

  test("ignora símbolos, espacios y texto", () => {
    expect(parseImporte(" 1 500 € ")).toBe(1500);
    expect(parseImporte("1500 euros")).toBe(1500);
  });

  test("vacío o sin dígitos devuelve null", () => {
    expect(parseImporte("")).toBeNull();
    expect(parseImporte("   ")).toBeNull();
    expect(parseImporte("no lo sé")).toBeNull();
  });

  test("negativos se tratan como no informados", () => {
    // Un importe negativo no significa nada aquí y colarlo produciría un
    // coste por paciente negativo en pantalla.
    expect(parseImporte("-300")).toBeNull();
  });
});
