import { describe, expect, it } from "vitest";
import { claveQuiz, informeQuiz, notaQuiz, resumenQuiz, valoresQuiz, type CampoQuiz } from "../ventas/quiz";
import { claveDatoLead, parsearSecuencia, validarSecuencia, type Secuencia } from "../ventas/secuencias";
import { iniciarSimulacion, responderBoton, responderTexto, type EstadoSimulacion } from "../ventas/simulador";
import {
  PLANTILLAS,
  SECUENCIA_QUIZ_SALUD_A,
  SECUENCIA_QUIZ_SALUD_B,
  SECUENCIA_QUIZ_SALUD_C,
} from "../ventas/secuencias-plantilla";

const datos = (valores: Partial<Record<CampoQuiz, string>>): Record<string, string> =>
  Object.fromEntries(Object.entries(valores).map(([campo, valor]) => [claveQuiz(campo as CampoQuiz), valor as string]));

const CTX = { valores: {}, faseInicial: "nuevo" as const };

/** Recorre la secuencia pulsando, en cada paso, el botón con ese texto. */
function pulsar(s: Secuencia, textos: string[]): EstadoSimulacion {
  let estado = iniciarSimulacion(s, CTX);
  for (const texto of textos) {
    const paso = s.pasos[estado.pasoActual as string];
    const indice = paso.botones.findIndex((b) => b.texto === texto);
    expect(indice, `«${texto}» en ${estado.pasoActual}`).toBeGreaterThanOrEqual(0);
    estado = responderBoton(s, estado, indice, CTX);
  }
  return estado;
}

describe("quiz: clave y nota", () => {
  it("la clave es la misma que la de los datos pendientes del lead", () => {
    // quiz.ts no puede importar `claveDatoLead` (ciclo); si divergen, el motor
    // guardaría la respuesta donde el quiz no la busca.
    expect(claveQuiz("quiz_atencion")).toBe(claveDatoLead("quiz_atencion"));
  });

  it("puntúa de 0 a 100 en saltos de sexto", () => {
    expect(notaQuiz(datos({ quiz_visibilidad: "verde", quiz_captacion: "verde", quiz_atencion: "verde" }))).toBe(100);
    expect(notaQuiz(datos({ quiz_visibilidad: "rojo", quiz_captacion: "rojo", quiz_atencion: "rojo" }))).toBe(0);
    expect(notaQuiz(datos({ quiz_visibilidad: "amarillo", quiz_captacion: "rojo", quiz_atencion: "verde" }))).toBe(50);
  });

  it("sin las tres áreas no hay nota ni informe (la temperatura no puntúa)", () => {
    const d = datos({ quiz_visibilidad: "verde", quiz_captacion: "verde", quiz_temperatura: "ya" });
    expect(notaQuiz(d)).toBeNull();
    expect(valoresQuiz(d)).toEqual({ quiz_nota: null, quiz_informe: null });
  });

  it("un valor que no existe cuenta como no contestado", () => {
    expect(notaQuiz(datos({ quiz_visibilidad: "azul", quiz_captacion: "verde", quiz_atencion: "verde" }))).toBeNull();
  });
});

describe("quiz: informe", () => {
  it("pone la nota, una línea por área y el tratamiento con las rojas primero", () => {
    const informe = informeQuiz(datos({ quiz_visibilidad: "amarillo", quiz_captacion: "rojo", quiz_atencion: "verde" }));
    expect(informe).toContain("*Tu salud digital: 50/100* 🟡");
    expect(informe).toContain("🟡 *Visibilidad:*");
    expect(informe).toContain("🔴 *Captación:*");
    expect(informe).toContain("🟢 *Atención:*");
    const tratamiento = (informe as string).split("*Tu tratamiento:*")[1];
    expect(tratamiento.indexOf("1. Un canal")).toBeLessThan(tratamiento.indexOf("2. Que te encuentren"));
    expect(tratamiento).not.toContain("Contestar en minutos");
  });

  it("todo en verde no inventa mejoras", () => {
    const informe = informeQuiz(datos({ quiz_visibilidad: "verde", quiz_captacion: "verde", quiz_atencion: "verde" }));
    expect(informe).toContain("vas muy bien");
    expect(informe).not.toMatch(/\n1\. /);
  });

  it("el informe más largo cabe en un mensaje con botones junto a su cierre", () => {
    // WhatsApp corta el cuerpo de un mensaje interactivo en 1024 caracteres.
    const peor = informeQuiz(datos({ quiz_visibilidad: "rojo", quiz_captacion: "amarillo", quiz_atencion: "rojo" })) as string;
    for (const id of ["informe_ya", "informe_pronto", "informe_mirando"]) {
      const texto = SECUENCIA_QUIZ_SALUD_A.pasos[id].texto.replace("{{quiz_informe}}", peor);
      expect(texto.length, id).toBeLessThanOrEqual(1024);
    }
  });
});

describe("quiz: resumen para la ficha", () => {
  it("lleva nota, respuestas y temperatura", () => {
    const r = resumenQuiz(
      datos({ quiz_visibilidad: "amarillo", quiz_captacion: "rojo", quiz_atencion: "verde", quiz_temperatura: "ya" }),
    );
    expect(r).toBe(
      "Chequeo de salud digital: 50/100 · Visibilidad 🟡 solo ficha de Google · Captación 🔴 boca a boca · Atención 🟢 en minutos · Cuándo: quiere empezar ya 🔥",
    );
  });

  it("sin respuestas del quiz no dice nada", () => {
    expect(resumenQuiz({ problema: "x" })).toBeNull();
  });
});

describe("validarSecuencia con quiz", () => {
  const base = (): Secuencia => ({
    version: 1,
    inicio: "p1",
    pasos: {
      p1: {
        tipo: "mensaje",
        texto: "¿Te encuentran?",
        botones: [{ texto: "Sí", guardar_en_lead: { campo: "quiz_visibilidad", valor: "verde" }, ruta: { ir_a: "fin" } }],
      },
      fin: { tipo: "mensaje", texto: "{{quiz_informe}}", botones: [], ruta: { terminar: true } },
    },
  });

  it("las variables del quiz existen", () => {
    const avisos = validarSecuencia(base()).filter((a) => a.mensaje.includes("no existe"));
    expect(avisos).toEqual([]);
  });

  it("avisa grave si enseña el informe sin preguntar las tres áreas", () => {
    const aviso = validarSecuencia(base()).find((a) => a.paso === "fin");
    expect(aviso?.grave).toBe(true);
    expect(aviso?.mensaje).toContain("captacion, atencion");
  });

  it("avisa grave de un valor de quiz que no existe", () => {
    const s = base();
    s.pasos.p1.botones[0].guardar_en_lead = { campo: "quiz_visibilidad", valor: "ya" };
    expect(validarSecuencia(s).some((a) => a.grave && a.mensaje.includes("valor que no existe"))).toBe(true);
  });
});

/** Respuestas de cada pregunta por campo: el orden de los pasos cambia entre
 *  variantes, las opciones no. */
const RESPUESTA = {
  quiz_visibilidad: "Solo ficha Google",
  quiz_captacion: "Boca a boca",
  quiz_atencion: "En minutos",
} as const;

describe.each([
  ["A", SECUENCIA_QUIZ_SALUD_A, ["quiz_visibilidad", "quiz_captacion", "quiz_atencion"]],
  ["B", SECUENCIA_QUIZ_SALUD_B, ["quiz_atencion", "quiz_captacion", "quiz_visibilidad"]],
  ["C", SECUENCIA_QUIZ_SALUD_C, ["quiz_captacion", "quiz_visibilidad", "quiz_atencion"]],
] as const)("plantilla del chequeo, variante %s", (_v, s, orden) => {
  const respuestas = orden.map((campo) => RESPUESTA[campo]);

  it("se ofrece al crear una secuencia, parsea y no tiene avisos", () => {
    expect(PLANTILLAS.some((p) => p.secuencia === s)).toBe(true);
    expect(parsearSecuencia(s).ok).toBe(true);
    expect(validarSecuencia(s)).toEqual([]);
  });

  it("pregunta los cuatro datos en su orden, con un botón por opción", () => {
    const campos = ["p1", "p2", "p3", "p4"].map((id) => {
      const botones = s.pasos[id].botones;
      const campo = botones[0].guardar_en_lead?.campo;
      expect(botones.every((b) => b.guardar_en_lead?.campo === campo), id).toBe(true);
      expect(new Set(botones.map((b) => b.guardar_en_lead?.valor)).size, id).toBe(3);
      return campo;
    });
    expect(campos).toEqual([...orden, "quiz_temperatura"]);
    expect(s.pasos.p1.texto).toContain("Paula");
    expect(s.pasos.p1.texto).toContain("dinkbit.es/privacidad");
  });

  it("las mismas respuestas dan la misma nota que en cualquier otra variante", () => {
    const e = pulsar(s, [...respuestas, "Ya mismo"]);
    expect(e.crearLead).toBe(true);
    expect(e.pasoActual).toBe("informe_ya");
    expect(e.faltanVariables).toEqual([]);
    const informe = e.conversacion.at(-1);
    expect(informe?.texto).toContain("*Tu salud digital: 50/100*");
    expect(informe?.botones).toEqual(["Llamadme hoy", "Mejor mañana", "Prefiero por aquí"]);
  });

  it("cada temperatura lleva a su cierre", () => {
    expect(pulsar(s, [...respuestas, "En 1-3 meses"]).pasoActual).toBe("informe_pronto");
    expect(pulsar(s, [...respuestas, "Solo estoy mirando"]).pasoActual).toBe("informe_mirando");
  });

  it("pedir llamada avisa a la comercial y mueve el lead a interesado", () => {
    const e = pulsar(s, [...respuestas, "Ya mismo", "Llamadme hoy"]);
    expect(e.avisos).toContain("Avisar a la comercial");
    expect(e.fase).toBe("interesado");
    expect(e.conversacion.at(-1)?.texto).toContain("Te llamo hoy");
  });

  it("«Solo estoy mirando» recoge la web escrita y avisa", () => {
    const mirando = pulsar(s, [...respuestas, "Solo estoy mirando"]);
    const e = responderTexto(s, mirando, "minegocio.es", CTX);
    expect(e.datos.web).toBe("minegocio.es");
    expect(e.avisos).toContain("Avisar a la comercial");
  });
});
