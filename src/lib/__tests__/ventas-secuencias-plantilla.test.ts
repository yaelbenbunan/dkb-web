import { describe, expect, it } from "vitest";
import { parsearSecuencia, validarSecuencia, type Secuencia } from "../ventas/secuencias";
import { PLANTILLAS, SECUENCIA_DENTAL, SECUENCIA_PSICOLOGIA, secuenciaDePlantilla } from "../ventas/secuencias-plantilla";

/** Pasos a los que se puede llegar pulsando un botón del paso dado. */
const destinosDeBotones = (s: Secuencia, id: string): string[] =>
  s.pasos[id].botones.map((b) => b.ruta.ir_a).filter((d): d is string => Boolean(d));

/** Las dos plantillas comparten esqueleto: el paso donde se elige el problema
 *  del sector se llama siempre «problemas», y de ahí salen las tres ramas. */
const PASO_PROBLEMAS = "problemas";

describe.each([
  ["dental", SECUENCIA_DENTAL],
  ["psicología", SECUENCIA_PSICOLOGIA],
])("plantilla de %s", (_nombre, secuencia) => {
  it("cumple la forma que exige el motor", () => {
    const res = parsearSecuencia(secuencia);
    expect(res.ok).toBe(true);
  });

  it("no tiene ningún aviso grave", () => {
    const graves = validarSecuencia(secuencia).filter((a) => a.grave);
    expect(graves).toEqual([]);
  });

  it("no necesita ninguna plantilla aprobada", () => {
    // La conversación la arranca el lead pulsando un anuncio Click-to-WhatsApp:
    // es él quien abre la ventana, así que nuestro primer mensaje es una
    // respuesta y va en texto libre. Marcarlo como plantilla obligaría a
    // esperar la aprobación de Meta sin ninguna necesidad.
    const conPlantilla = Object.entries(secuencia.pasos)
      .filter(([, p]) => p.plantilla)
      .map(([id]) => id);
    expect(conPlantilla).toEqual([]);
  });

  it("avisa a la comercial en algún camino", () => {
    const avisa = Object.values(secuencia.pasos).some((p) =>
      [...p.botones.map((b) => b.ruta), ...(p.ruta ? [p.ruta] : [])].some((r) => r.avisar),
    );
    expect(avisa).toBe(true);
  });

  it("reintenta una sola vez tras una espera a quien dice que ahora no", () => {
    const esperas = Object.values(secuencia.pasos).flatMap((p) =>
      [...p.botones.map((b) => b.ruta), ...(p.ruta ? [p.ruta] : [])]
        .map((r) => r.esperar_dias)
        .filter((d): d is number => d !== undefined),
    );
    expect(esperas).toEqual([7]);
  });

  it("lleva cada problema a un cierre distinto", () => {
    const destinos = destinosDeBotones(secuencia, PASO_PROBLEMAS);
    expect(destinos).toHaveLength(3);
    expect(new Set(destinos).size).toBe(3);
  });
});

describe("plantilla dental", () => {
  it("pregunta por el paciente que se queda en la primera visita", () => {
    const textos = Object.values(SECUENCIA_DENTAL.pasos).flatMap((p) => p.botones.map((b) => b.texto));
    expect(textos).toContain("Primera visita y ya");
  });

  it("habla de beneficio, que es el argumento del sector", () => {
    const todo = Object.values(SECUENCIA_DENTAL.pasos).map((p) => p.texto).join(" ").toLowerCase();
    expect(todo).toContain("beneficio");
  });
});

describe("plantilla psicología", () => {
  it("habla de la agenda y no de ganar más", () => {
    const todo = Object.values(SECUENCIA_PSICOLOGIA.pasos).map((p) => p.texto).join(" ").toLowerCase();
    expect(todo).toContain("agenda");
    // Decisión del 17-09-2026: a una consulta de psicología no se le vende
    // «ganar más», porque la sesión tiene un precio que no se estira.
    expect(todo).not.toContain("ganar más");
  });
});

describe("secuenciaDePlantilla", () => {
  it("devuelve la plantilla pedida", () => {
    expect(secuenciaDePlantilla("dental")).toBe(SECUENCIA_DENTAL);
    expect(secuenciaDePlantilla("psicologia")).toBe(SECUENCIA_PSICOLOGIA);
  });

  it("cae a una secuencia vacía sin plantilla o con una clave que no existe", () => {
    // Lo que manda el formulario no es de fiar: una clave inventada no puede
    // reventar la creación, tiene que caer al punto de partida de siempre.
    for (const clave of [undefined, "", "inventada"]) {
      const s = secuenciaDePlantilla(clave);
      expect(Object.keys(s.pasos)).toEqual([s.inicio]);
    }
  });
});

describe("PLANTILLAS", () => {
  it("ofrece las dos con un nombre para el selector del panel", () => {
    expect(PLANTILLAS.map((p) => p.clave)).toEqual(["dental", "psicologia"]);
    for (const plantilla of PLANTILLAS) {
      expect(plantilla.nombre.length).toBeGreaterThan(0);
    }
  });
});
