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

  test("rangos escritos a mano: se queda con el primer número", () => {
    // Respuestas humanas naturalísimas en un campo libre. Sin el corte del
    // rango, "20-25" pierde el guion y concatena a 2025, y "3 o 4" a 34: un
    // error de varios órdenes de magnitud presentado como si fuera el dato
    // del usuario.
    expect(parseImporte("20-25")).toBe(20);
    expect(parseImporte("3 o 4")).toBe(3);
    expect(parseImporte("5 a 10")).toBe(5);
    expect(parseImporte("1.500-2.000")).toBe(1500);
  });
});

import { calcular } from "../growth-calc";

describe("calcular", () => {
  test("rama A: sabe inversión y pacientes", () => {
    const r = calcular({ inversion: 1500, pacientes: 17, ticket: null });
    expect(r.rama).toBe("A");
    expect(r.costePorPaciente).toBe(88.24);
    expect(r.generado).toBeNull();
    expect(r.retorno).toBeNull();
    expect(r.sinPacientes).toBe(false);
  });

  test("rama A con ticket medio: generado y retorno", () => {
    const r = calcular({ inversion: 1000, pacientes: 10, ticket: 400 });
    expect(r.rama).toBe("A");
    expect(r.costePorPaciente).toBe(100);
    expect(r.generado).toBe(4000);
    expect(r.retorno).toBe(4);
  });

  test("rama B: no sabe cuántos pacientes le llegan", () => {
    const r = calcular({ inversion: 1500, pacientes: null, ticket: 400 });
    expect(r.rama).toBe("B");
    expect(r.costePorPaciente).toBeNull();
    // Sin número de pacientes no se puede estimar lo generado.
    expect(r.generado).toBeNull();
    expect(r.retorno).toBeNull();
    expect(r.sinPacientes).toBe(false);
  });

  test("rama B con cero pacientes: invierte y no llega nadie", () => {
    const r = calcular({ inversion: 1500, pacientes: 0, ticket: null });
    expect(r.rama).toBe("B");
    expect(r.sinPacientes).toBe(true);
    // Lo que nunca debe pasar: Infinity o NaN en pantalla.
    expect(r.costePorPaciente).toBeNull();
  });

  test("rama C: no invierte todavía", () => {
    const r = calcular({ inversion: null, pacientes: 5, ticket: 400 });
    expect(r.rama).toBe("C");
    expect(r.costePorPaciente).toBeNull();
    // Esos pacientes existen y son orgánicos: se puede decir cuánto valen.
    expect(r.generado).toBe(2000);
    // Pero sin inversión no hay retorno que calcular.
    expect(r.retorno).toBeNull();
  });

  test("inversión cero se trata igual que no invertir", () => {
    expect(calcular({ inversion: 0, pacientes: 5, ticket: null }).rama).toBe("C");
  });

  test("números absurdos no rompen ni devuelven NaN", () => {
    const r = calcular({ inversion: 9_999_999, pacientes: 5000, ticket: 1 });
    expect(Number.isFinite(r.costePorPaciente as number)).toBe(true);
    expect(Number.isFinite(r.generado as number)).toBe(true);
  });

  test("todo desconocido: rama C, sin cifras", () => {
    const r = calcular({ inversion: null, pacientes: null, ticket: null });
    expect(r.rama).toBe("C");
    expect(r.costePorPaciente).toBeNull();
    expect(r.generado).toBeNull();
    expect(r.retorno).toBeNull();
  });
});

import { formatEur } from "../growth-calc";

describe("formatEur", () => {
  test("formatea con coma decimal y símbolo", () => {
    expect(formatEur(88.24)).toBe("88,24 €");
    expect(formatEur(100)).toBe("100,00 €");
    expect(formatEur(0)).toBe("0,00 €");
  });

  test("pone separador de miles", () => {
    expect(formatEur(4000)).toBe("4.000,00 €");
    expect(formatEur(6800)).toBe("6.800,00 €");
    expect(formatEur(1500000)).toBe("1.500.000,00 €");
  });
});
