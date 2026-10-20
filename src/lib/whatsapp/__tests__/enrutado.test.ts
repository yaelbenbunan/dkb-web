import { describe, expect, it } from "vitest";
import { elegirMarca } from "../enrutado";

describe("elegirMarca", () => {
  it("la asignada gana siempre", () => {
    expect(elegirMarca({ numeroId: "1", numeroEntorno: "1", asignada: { id: "m" } })).toBe("asignada");
  });
  it("sin número es dinkbit", () => {
    expect(elegirMarca({ numeroId: null, numeroEntorno: "1", asignada: null })).toBe("dinkbit");
  });
  it("el número de entorno sin asignada es dinkbit", () => {
    expect(elegirMarca({ numeroId: "1", numeroEntorno: "1", asignada: null })).toBe("dinkbit");
  });
  it("un número ajeno sin asignada es desconocida", () => {
    expect(elegirMarca({ numeroId: "2", numeroEntorno: "1", asignada: null })).toBe("desconocida");
    expect(elegirMarca({ numeroId: "2", numeroEntorno: null, asignada: null })).toBe("desconocida");
  });
});
