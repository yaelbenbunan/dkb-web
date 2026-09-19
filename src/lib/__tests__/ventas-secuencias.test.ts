import { describe, expect, test } from "vitest";
import {
  parsearSecuencia,
  renderizarTexto,
  secuenciaVacia,
  siguientesPasos,
  validarSecuencia,
  variablesEnTexto,
  type Secuencia,
} from "../ventas/secuencias";

/** Secuencia de dos pasos sin ningún problema, para partir de un caso limpio. */
function base(): Secuencia {
  return {
    version: 1,
    inicio: "p1",
    pasos: {
      p1: {
        tipo: "mensaje",
        plantilla: true,
        texto: "Hola {{contacto}}, soy {{remitente}} de {{marca}}.",
        botones: [
          { texto: "Sí", ruta: { ir_a: "p2" } },
          { texto: "No", ruta: { terminar: true } },
        ],
      },
      p2: {
        tipo: "mensaje",
        texto: "Genial, cuéntame más.",
        botones: [],
        ruta: { terminar: true },
      },
    },
  };
}

describe("validarSecuencia", () => {
  test("una secuencia sin problemas no da ningún aviso", () => {
    expect(validarSecuencia(base())).toEqual([]);
  });

  test("regla 1: el inicio tiene que existir entre los pasos (grave)", () => {
    const s = base();
    s.inicio = "no-existe";
    const avisos = validarSecuencia(s);
    expect(avisos.some((a) => a.paso === "no-existe" && a.grave)).toBe(true);
  });

  test("regla 2: un ir_a tiene que apuntar a un paso que exista (grave)", () => {
    const s = base();
    s.pasos.p1.botones[0].ruta = { ir_a: "px" };
    const avisos = validarSecuencia(s);
    expect(avisos.some((a) => a.paso === "p1" && a.grave)).toBe(true);
  });

  test("regla 3: un paso al que no llega nadie desde el inicio es un aviso", () => {
    const s = base();
    s.pasos.p3 = { tipo: "mensaje", texto: "Nadie llega aquí.", botones: [], ruta: { terminar: true } };
    const avisos = validarSecuencia(s);
    expect(avisos.some((a) => a.paso === "p3" && a.grave === false)).toBe(true);
  });

  test("regla 4: un paso sin botones necesita ruta, si no la conversación se queda parada (grave)", () => {
    const s = base();
    delete s.pasos.p2.ruta;
    const avisos = validarSecuencia(s);
    expect(avisos.some((a) => a.paso === "p2" && a.grave)).toBe(true);
  });

  test("regla 5: dos botones del mismo paso no pueden repetir texto (aviso)", () => {
    const s = base();
    s.pasos.p1.botones[1].texto = "Sí";
    const avisos = validarSecuencia(s);
    expect(avisos.some((a) => a.paso === "p1" && a.grave === false)).toBe(true);
  });

  test("regla 6: las variables usadas tienen que estar permitidas (grave)", () => {
    const s = base();
    s.pasos.p1.texto = "Hola {{contacto}}, esto vale {{precio_secreto}}.";
    const avisos = validarSecuencia(s);
    expect(avisos.some((a) => a.paso === "p1" && a.grave)).toBe(true);
  });

  test("las variables extra pasadas a validarSecuencia sí están permitidas", () => {
    const s = base();
    s.pasos.p1.texto = "Hola {{contacto}}, esto vale {{precio_mayorista}}.";
    const avisos = validarSecuencia(s, ["precio_mayorista"]);
    expect(avisos.some((a) => a.paso === "p1" && a.grave)).toBe(false);
  });

  test("regla 7: solo el paso de inicio puede ser plantilla (aviso)", () => {
    const s = base();
    s.pasos.p2.plantilla = true;
    const avisos = validarSecuencia(s);
    expect(avisos.some((a) => a.paso === "p2" && a.grave === false)).toBe(true);
  });

  test("regla 8: esperar_dias tiene que estar entre 1 y 90 (grave)", () => {
    const s = base();
    s.pasos.p1.botones[1].ruta = { esperar_dias: 200, ir_a: "p1" };
    const avisos = validarSecuencia(s);
    expect(avisos.some((a) => a.paso === "p1" && a.grave)).toBe(true);
  });

  test("regla 9: una ruta que termina no puede llevar también a otro paso (grave)", () => {
    const s = base();
    s.pasos.p1.botones[1].ruta = { terminar: true, ir_a: "p2" };
    const avisos = validarSecuencia(s);
    expect(avisos.some((a) => a.paso === "p1" && a.grave)).toBe(true);
  });
});

describe("parsearSecuencia", () => {
  test("una secuencia válida se lee bien", () => {
    const r = parsearSecuencia(base());
    expect(r.ok).toBe(true);
  });

  test("basura devuelve un error legible sin reventar", () => {
    const r = parsearSecuencia("esto no es una secuencia");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(typeof r.error).toBe("string");
    if (!r.ok) expect(r.error.length).toBeGreaterThan(0);
  });

  test("un objeto a medias también devuelve error legible", () => {
    const r = parsearSecuencia({ version: 1 });
    expect(r.ok).toBe(false);
  });
});

describe("variablesEnTexto", () => {
  test("encuentra las variables sin repetir", () => {
    expect(variablesEnTexto("Hola {{negocio}} y {{contacto}}")).toEqual(["negocio", "contacto"]);
    expect(variablesEnTexto("Hola {{negocio}}, {{negocio}}")).toEqual(["negocio"]);
    expect(variablesEnTexto("Sin variables")).toEqual([]);
  });
});

describe("renderizarTexto", () => {
  test("sustituye lo que tiene valor y avisa de lo que falta", () => {
    const r = renderizarTexto("Hola {{negocio}}, en {{ciudad}}.", { negocio: "Hydrup", ciudad: null });
    expect(r.texto).toBe("Hola Hydrup, en {{ciudad}}.");
    expect(r.faltan).toEqual(["ciudad"]);
  });

  test("sin huecos no falta nada", () => {
    const r = renderizarTexto("Hola {{negocio}}.", { negocio: "Hydrup" });
    expect(r).toEqual({ texto: "Hola Hydrup.", faltan: [] });
  });
});

describe("secuenciaVacia", () => {
  test("pasa validarSecuencia sin avisos graves", () => {
    const avisos = validarSecuencia(secuenciaVacia());
    expect(avisos.every((a) => !a.grave)).toBe(true);
  });
});

describe("siguientesPasos", () => {
  test("devuelve los destinos de los botones y de la ruta del paso", () => {
    const s = base();
    expect(siguientesPasos(s, "p1")).toEqual(["p2"]);
    expect(siguientesPasos(s, "p2")).toEqual([]);
  });

  test("junta destinos de botones y de la ruta propia del paso, sin duplicar", () => {
    const s = base();
    s.pasos.p3 = {
      tipo: "mensaje",
      texto: "Paso con botones y ruta propia.",
      botones: [
        { texto: "A", ruta: { ir_a: "p1" } },
        { texto: "B", ruta: { ir_a: "p2" } },
      ],
      ruta: { ir_a: "p1" },
    };
    expect(siguientesPasos(s, "p3")).toEqual(["p1", "p2"]);
  });

  test("un paso que no existe no tiene destinos", () => {
    expect(siguientesPasos(base(), "no-existe")).toEqual([]);
  });
});
