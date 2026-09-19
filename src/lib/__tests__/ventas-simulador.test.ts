import { describe, expect, test } from "vitest";
import { iniciarSimulacion, responderBoton, responderTexto, type ContextoSimulacion } from "../ventas/simulador";
import type { Secuencia } from "../ventas/secuencias";

/** Secuencia con un poco de todo: ir_a, fase, avisar, esperar_dias, terminar y
 *  guardar_respuesta_en, para poder probar el motor entero. */
function secuencia(): Secuencia {
  return {
    version: 1,
    inicio: "p1",
    pasos: {
      p1: {
        tipo: "mensaje",
        plantilla: true,
        texto: "Hola {{contacto}}, soy {{remitente}} de {{marca}}. Trabajamos con {{negocio}} en {{ciudad}}.",
        guardar_respuesta_en: "interes",
        botones: [
          { texto: "Sí, cuéntame", ruta: { ir_a: "p2" } },
          { texto: "Ahora no", ruta: { esperar_dias: 15, ir_a: "p1" } },
          { texto: "No me interesa", ruta: { fase: "no_interesa", terminar: true } },
        ],
      },
      p2: {
        tipo: "mensaje",
        texto: "Cada stick te sale a {{precio_mayorista}}.",
        botones: [
          { texto: "Quiero muestras", ruta: { ir_a: "p3", fase: "interesado" } },
          { texto: "Que me llaméis", ruta: { ir_a: "p3", avisar: true } },
        ],
      },
      p3: {
        tipo: "mensaje",
        texto: "¿A qué dirección te las mandamos?",
        botones: [],
        guardar_respuesta_en: "direccion",
        ruta: { fase: "muestras", terminar: true },
      },
      p4: {
        tipo: "mensaje",
        texto: "¿Prefieres que te llamemos o seguimos por WhatsApp?",
        botones: [],
        ruta: { ir_a: "p2" },
      },
    },
  };
}

const ctx: ContextoSimulacion = {
  valores: { negocio: "Hydrup", contacto: "Ana", ciudad: null, marca: "Hydrup", remitente: "Yael" },
  faseInicial: "nuevo",
};

describe("iniciarSimulacion", () => {
  test("mete el mensaje del paso de inicio con sus botones y deja pasoActual en él", () => {
    const estado = iniciarSimulacion(secuencia(), ctx);
    expect(estado.pasoActual).toBe("p1");
    expect(estado.terminada).toBe(false);
    expect(estado.conversacion).toHaveLength(1);
    expect(estado.conversacion[0].de).toBe("marca");
    expect(estado.conversacion[0].botones).toEqual(["Sí, cuéntame", "Ahora no", "No me interesa"]);
  });
});

describe("responderBoton", () => {
  test("añade la respuesta del negocio y luego el mensaje del paso destino", () => {
    let estado = iniciarSimulacion(secuencia(), ctx);
    estado = responderBoton(secuencia(), estado, 0, ctx);
    expect(estado.pasoActual).toBe("p2");
    expect(estado.conversacion.map((e) => e.de)).toEqual(["marca", "negocio", "marca"]);
    expect(estado.conversacion[1]).toEqual({ de: "negocio", texto: "Sí, cuéntame" });
  });

  test("la ruta puede cambiar la fase del estado", () => {
    let estado = iniciarSimulacion(secuencia(), ctx);
    estado = responderBoton(secuencia(), estado, 0, ctx); // -> p2
    estado = responderBoton(secuencia(), estado, 0, ctx); // "Quiero muestras" -> p3, fase interesado
    expect(estado.fase).toBe("interesado");
  });

  test("avisar añade un aviso legible", () => {
    let estado = iniciarSimulacion(secuencia(), ctx);
    estado = responderBoton(secuencia(), estado, 0, ctx); // -> p2
    estado = responderBoton(secuencia(), estado, 1, ctx); // "Que me llaméis" -> avisar
    expect(estado.avisos).toContain("Avisar a la comercial");
  });

  test("esperar_dias deja esperaDias y no avanza", () => {
    let estado = iniciarSimulacion(secuencia(), ctx);
    estado = responderBoton(secuencia(), estado, 1, ctx); // "Ahora no" -> esperar_dias 15, ir_a p1
    expect(estado.esperaDias).toBe(15);
    expect(estado.pasoActual).toBeNull();
    expect(estado.terminada).toBe(false);
    // no se añade ningún mensaje nuevo de la marca: solo inicio + respuesta.
    expect(estado.conversacion).toHaveLength(2);
  });

  test("terminar marca terminada y deja pasoActual en null", () => {
    let estado = iniciarSimulacion(secuencia(), ctx);
    estado = responderBoton(secuencia(), estado, 2, ctx); // "No me interesa" -> fase no_interesa, terminar
    expect(estado.terminada).toBe(true);
    expect(estado.pasoActual).toBeNull();
    expect(estado.fase).toBe("no_interesa");
  });

  test("guardar_respuesta_en guarda en datos el texto del botón pulsado", () => {
    let estado = iniciarSimulacion(secuencia(), ctx);
    estado = responderBoton(secuencia(), estado, 0, ctx);
    expect(estado.datos.interes).toBe("Sí, cuéntame");
  });

  test("pulsar un índice de botón que no existe no cambia el estado", () => {
    const estado = iniciarSimulacion(secuencia(), ctx);
    const resultado = responderBoton(secuencia(), estado, 99, ctx);
    expect(resultado).toEqual(estado);
  });

  test("una secuencia con ir_a a un paso inexistente no revienta: termina con un aviso grave", () => {
    const rota: Secuencia = {
      version: 1,
      inicio: "p1",
      pasos: {
        p1: { tipo: "mensaje", texto: "Hola", botones: [{ texto: "Seguir", ruta: { ir_a: "no-existe" } }] },
      },
    };
    let estado = iniciarSimulacion(rota, ctx);
    estado = responderBoton(rota, estado, 0, ctx);
    expect(estado.terminada).toBe(true);
    expect(estado.pasoActual).toBeNull();
    expect(estado.avisos.some((a) => a.includes("no-existe"))).toBe(true);
  });
});

describe("responderTexto", () => {
  test("en un paso CON botones, el texto libre para la secuencia y avisa a la comercial", () => {
    let estado = iniciarSimulacion(secuencia(), ctx);
    estado = responderTexto(secuencia(), estado, "Quiero saber más antes de nada", ctx);
    expect(estado.terminada).toBe(true);
    expect(estado.pasoActual).toBeNull();
    expect(estado.avisos).toContain("Respuesta libre: la secuencia se para y se avisa a la comercial");
    expect(estado.conversacion.at(-1)).toEqual({ de: "negocio", texto: "Quiero saber más antes de nada" });
    expect(estado.datos).toEqual({});
  });

  test("en una pregunta abierta, guarda la respuesta en datos y sigue la ruta del paso (fase y terminar)", () => {
    let estado = iniciarSimulacion(secuencia(), ctx);
    estado = responderBoton(secuencia(), estado, 0, ctx); // -> p2
    estado = responderBoton(secuencia(), estado, 0, ctx); // "Quiero muestras" -> p3 (pregunta abierta)
    expect(estado.pasoActual).toBe("p3");

    estado = responderTexto(secuencia(), estado, "Calle Mayor 3, Madrid", ctx);

    expect(estado.datos.direccion).toBe("Calle Mayor 3, Madrid");
    expect(estado.fase).toBe("muestras");
    expect(estado.terminada).toBe(true);
    expect(estado.pasoActual).toBeNull();
    expect(estado.avisos).not.toContain("Respuesta libre: la secuencia se para y se avisa a la comercial");
    expect(estado.conversacion.at(-1)).toEqual({ de: "negocio", texto: "Calle Mayor 3, Madrid" });
  });

  test("una pregunta abierta sin guardar_respuesta_en no guarda nada, pero sigue aplicando su ruta", () => {
    const s = secuencia();
    delete s.pasos.p3.guardar_respuesta_en;
    let estado = iniciarSimulacion(s, ctx);
    estado = responderBoton(s, estado, 0, ctx); // -> p2
    estado = responderBoton(s, estado, 0, ctx); // -> p3

    estado = responderTexto(s, estado, "Calle Mayor 3, Madrid", ctx);

    // "interes" viene del botón de p1; la pregunta abierta no añade "direccion".
    expect(estado.datos).toEqual({ interes: "Sí, cuéntame" });
    expect(estado.fase).toBe("muestras");
    expect(estado.terminada).toBe(true);
  });

  test("ir_a desde una pregunta abierta avanza al siguiente paso y muestra su mensaje", () => {
    const s = secuencia();
    let estado = iniciarSimulacion(s, ctx);
    estado = { ...estado, pasoActual: "p4", terminada: false };

    estado = responderTexto(s, estado, "Por WhatsApp, mejor", ctx);

    expect(estado.pasoActual).toBe("p2");
    expect(estado.terminada).toBe(false);
    expect(estado.conversacion.at(-1)).toEqual({
      de: "marca",
      texto: "Cada stick te sale a {{precio_mayorista}}.",
      botones: ["Quiero muestras", "Que me llaméis"],
    });
  });
});

describe("variables sin valor", () => {
  test("salen en faltanVariables y el texto muestra el hueco tal cual", () => {
    const estado = iniciarSimulacion(secuencia(), ctx);
    expect(estado.faltanVariables).toContain("ciudad");
    expect(estado.conversacion[0].texto).toContain("{{ciudad}}");
  });
});
