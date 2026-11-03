import { describe, expect, it } from "vitest";
import { conPorcentaje, resultadosPorSecuencia, type ConversacionMedida } from "../ventas/metricas-secuencias";

const conv = (patch: Partial<ConversacionMedida>): ConversacionMedida => ({
  secuencia_id: "A",
  estado: "bot",
  lead_id: null,
  datos: {},
  ...patch,
});

const quiz = (temperatura: string | null, niveles: [string, string, string] = ["verde", "amarillo", "rojo"]) => ({
  "lead.quiz_visibilidad": niveles[0],
  "lead.quiz_captacion": niveles[1],
  "lead.quiz_atencion": niveles[2],
  ...(temperatura ? { "lead.quiz_temperatura": temperatura } : {}),
});

describe("resultadosPorSecuencia", () => {
  it("cuenta por variante: empezaron, terminaron, con comercial y clientes", () => {
    const r = resultadosPorSecuencia(
      [
        conv({ datos: {} }),
        conv({ datos: quiz("ya"), estado: "humana", lead_id: "l1" }),
        conv({ datos: quiz("mirando"), lead_id: "l2" }),
        conv({ secuencia_id: "B", datos: quiz("pronto", ["verde", "verde", "verde"]), estado: "cerrada", lead_id: "l3" }),
        conv({ secuencia_id: null, estado: "humana" }),
      ],
      new Map([
        ["l1", "cliente"],
        ["l2", "nuevo"],
        ["l3", "interesado"],
      ]),
    );
    expect(r.get("A")).toEqual({ empezaron: 3, terminaronQuiz: 2, conComercial: 1, clientes: 1, notaMedia: 50 });
    expect(r.get("B")).toEqual({ empezaron: 1, terminaronQuiz: 1, conComercial: 1, clientes: 0, notaMedia: 100 });
    expect(r.size).toBe(2);
  });

  it("aguanta conversaciones sin datos", () => {
    expect(resultadosPorSecuencia([conv({ datos: null })], new Map()).get("A")?.notaMedia).toBeNull();
  });
});

describe("conPorcentaje", () => {
  it("redondea sobre el total y no divide entre cero", () => {
    expect(conPorcentaje(1, 3)).toBe("1 (33 %)");
    expect(conPorcentaje(0, 0)).toBe("0");
  });
});
