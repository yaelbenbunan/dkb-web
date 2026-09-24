import { describe, expect, it } from "vitest";
import type { EstadoSimulacion } from "../../ventas/simulador";
import { aEstadoGuardado, desdeEstadoGuardado, indiceDeBoton, mensajesAEnviar } from "../guion";

const estado = (parcial: Partial<EstadoSimulacion> = {}): EstadoSimulacion => ({
  conversacion: [],
  pasoActual: null,
  fase: "nuevo",
  datos: {},
  avisos: [],
  esperaDias: null,
  terminada: false,
  faltanVariables: [],
  ...parcial,
});

describe("indiceDeBoton", () => {
  it("traduce el id que mandamos al índice que espera el motor", () => {
    expect(indiceDeBoton("opcion_1")).toBe(0);
    expect(indiceDeBoton("opcion_3")).toBe(2);
  });

  it("devuelve null con un id que no reconocemos o sin id", () => {
    // Pasa si el lead escribe a mano, o si alguien cambia el formato del id en
    // el mensajero sin tocar esto. En los dos casos hay que irse por el camino
    // de texto libre, que para la secuencia y avisa, en vez de avanzar a ciegas.
    for (const id of [null, "", "boton_2", "opcion_cero", "opcion_0"]) {
      expect(indiceDeBoton(id)).toBeNull();
    }
  });
});

describe("mensajesAEnviar", () => {
  it("devuelve solo lo que dijo la marca, y solo lo nuevo", () => {
    const anterior = estado({ conversacion: [{ de: "marca", texto: "uno" }] });
    const nuevo = estado({
      conversacion: [
        { de: "marca", texto: "uno" },
        { de: "negocio", texto: "respondo" },
        { de: "marca", texto: "dos", botones: ["A", "B"] },
      ],
    });
    expect(mensajesAEnviar(anterior, nuevo)).toEqual([{ de: "marca", texto: "dos", botones: ["A", "B"] }]);
  });

  it("al arrancar manda todo lo que dijo la marca", () => {
    const nuevo = estado({ conversacion: [{ de: "marca", texto: "hola", botones: ["A"] }] });
    expect(mensajesAEnviar(null, nuevo)).toHaveLength(1);
  });
});

describe("estado guardado", () => {
  it("conserva paso y datos en el viaje de ida y vuelta", () => {
    const original = estado({ pasoActual: "problemas", datos: { problema_principal: "Huecos en la agenda" } });
    const recuperado = desdeEstadoGuardado(aEstadoGuardado(original), "contactado");
    expect(recuperado.pasoActual).toBe("problemas");
    expect(recuperado.datos).toEqual({ problema_principal: "Huecos en la agenda" });
    expect(recuperado.fase).toBe("contactado");
    // Con paso actual, la conversación sigue viva: no debe reconstruirse
    // como terminada (ver el test de abajo para el caso contrario).
    expect(recuperado.terminada).toBe(false);
  });

  it("el estado recuperado arranca sin hilo: el hilo vive en ventas_mensajes", () => {
    const recuperado = desdeEstadoGuardado({ pasoActual: "p1", datos: {} }, "nuevo");
    expect(recuperado.conversacion).toEqual([]);
    expect(recuperado.terminada).toBe(false);
  });

  it("sin paso actual, se reconstruye como terminada", () => {
    // responderBoton guarda con `estado.terminada || !estado.pasoActual`,
    // pero responderTexto solo mira `estado.terminada`. Si aquí dejáramos
    // `terminada` fija a false, un lead sin paso actual (cerrado, o parado
    // esperando el cron) que vuelve a escribir texto libre caería en la rama
    // final de responderTexto y repetiría el aviso de respuesta libre en
    // cada mensaje. Derivar terminada de pasoActual === null iguala las dos
    // guardas del motor.
    const recuperado = desdeEstadoGuardado({ pasoActual: null, datos: {} }, "cliente");
    expect(recuperado.terminada).toBe(true);
  });
});
