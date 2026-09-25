import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CUERPO, OPCIONES, type Vertical } from "../whatsapp/autorespuesta";
import { parsearSecuencia, validarSecuencia, type Secuencia } from "../ventas/secuencias";
import { iniciarSimulacion, responderBoton } from "../ventas/simulador";
import { PLANTILLAS, SECUENCIA_DENTAL, SECUENCIA_PSICOLOGIA, secuenciaDePlantilla } from "../ventas/secuencias-plantilla";

/** Pasos a los que se puede llegar pulsando un botón del paso dado. */
const destinosDeBotones = (s: Secuencia, id: string): string[] =>
  s.pasos[id].botones.map((b) => b.ruta.ir_a).filter((d): d is string => Boolean(d));

/** Contexto neutro para el motor: estas plantillas no usan variables, y la
 *  fase de partida es la del lead que acaba de llegar del anuncio. */
const CTX = { valores: {}, faseInicial: "nuevo" as const };

/** Recorre la secuencia como un lead real: arranca y pulsa el botón `indice`
 *  del paso de inicio. Devuelve el estado con el que queda el motor. */
const pulsar = (s: Secuencia, indice: number) => responderBoton(s, iniciarSimulacion(s, CTX), indice, CTX);

describe.each<[string, Vertical, Secuencia]>([
  ["dental", "dental", SECUENCIA_DENTAL],
  ["psicología", "psicologia", SECUENCIA_PSICOLOGIA],
])("plantilla de %s", (_nombre, vertical, secuencia) => {
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

  it("pulsar cualquier botón avisa a la comercial y mueve la fase, y manda su cierre", () => {
    // EJERCITA EL MOTOR, no la declaración. La versión anterior de este test
    // buscaba `some(ruta => ruta.avisar)` sobre TODAS las rutas de la
    // secuencia: daba verde mientras el `avisar` vivía en el paso de cierre,
    // donde `aplicarRuta` nunca llega por la vía de `ir_a` — o sea, daba la
    // confianza contraria justo en el camino que paga los clics de Meta.
    const inicio = secuencia.pasos[secuencia.inicio];
    inicio.botones.forEach((boton, indice) => {
      const estado = pulsar(secuencia, indice);
      expect(estado.avisos).toContain("Avisar a la comercial");
      expect(estado.fase).toBe("interesado");
      // Y el cierre SE MANDA: si el `terminar` estuviera en la ruta del
      // botón, `aplicarRuta` cortaría antes del `ir_a` y el lead se quedaría
      // sin el mensaje que le promete que le escriben.
      const destino = boton.ruta.ir_a as string;
      expect(estado.pasoActual).toBe(destino);
      expect(estado.conversacion.at(-1)).toEqual({ de: "marca", texto: secuencia.pasos[destino].texto });
      // Y queda guardado QUÉ problema dijo tener, que es lo que cualifica.
      expect(estado.datos.problema_principal).toBe(boton.texto);
    });
  });

  it("empieza preguntando, sin pasos de presentación", () => {
    // El saludo y la pregunta van juntos: cada mensaje antes de cualificar es
    // uno en el que el lead puede abandonar.
    const inicio = secuencia.pasos[secuencia.inicio];
    expect(inicio.botones).toHaveLength(3);
    expect(inicio.texto).toContain("Growth");
  });

  it("el inicio es, palabra por palabra, el de autorespuesta.ts", () => {
    // Ata las dos fuentes: si alguien retoca el copy en un sitio sin el otro,
    // este test lo saca a la luz en vez de que lo descubra un lead viendo un
    // mensaje distinto según lo mande la secuencia o el respaldo.
    const inicio = secuencia.pasos[secuencia.inicio];
    expect(inicio.texto).toBe(CUERPO[vertical]);
    expect(inicio.botones.map((b) => b.texto)).toEqual([...OPCIONES[vertical]]);
  });

  it("no deja al lead esperando: ningún camino se para en una espera", () => {
    // También por el motor, y no leyendo `esperar_dias` de las rutas: lo que
    // importa no es que el campo no esté escrito, es que recorriendo la
    // secuencia el motor nunca devuelva una espera (`esperaDias`), que es lo
    // que dejaría al lead mudo hasta que un cron —que hoy no existe— la
    // dispare.
    secuencia.pasos[secuencia.inicio].botones.forEach((_boton, indice) => {
      expect(pulsar(secuencia, indice).esperaDias).toBeNull();
    });
  });

  it("lleva cada problema a un cierre distinto", () => {
    const destinos = destinosDeBotones(secuencia, secuencia.inicio);
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

/* Los ficheros SQL no pueden divergir de las plantillas ---------------------- */

// Ninguna otra cosa del repo lee `docs/sql/`, así que hasta ahora el siguiente
// retoque de copy en `secuencias-plantilla.ts` habría divergido en silencio de
// lo que se siembra y se corrige en Supabase. Esa es exactamente la clase de
// fallo que costó la ronda de arreglos del CRITICAL de esta rama: el SQL llevaba
// una forma de ruta que el código ya no tenía.
describe("los literales jsonb de docs/sql/ cuadran con las plantillas", () => {
  /** Los literales `'...'::jsonb` de un fichero SQL, ya parseados. Postgres
   *  desescapa `''` como una comilla simple; el `\n` de dentro de la cadena lo
   *  convierte el parser de jsonb en un salto de línea, que es lo que hace
   *  `JSON.parse` por su cuenta. */
  const literalesDe = (ruta: string): unknown[] => {
    const sql = readFileSync(resolve(import.meta.dirname, "../../../", ruta), "utf8");
    return [...sql.matchAll(/'((?:[^']|'')*)'::jsonb/g)].map((m) => JSON.parse(m[1].replaceAll("''", "'")));
  };

  it("el seed siembra exactamente las dos plantillas", () => {
    expect(literalesDe("docs/sql/2026-09-24-secuencias-dinkbit.sql")).toEqual([
      JSON.parse(JSON.stringify(SECUENCIA_DENTAL)),
      JSON.parse(JSON.stringify(SECUENCIA_PSICOLOGIA)),
    ]);
  });

  it("el correctivo deja exactamente las dos plantillas", () => {
    // Cuatro literales: el `set` y el `where` de cada secuencia. Los `set` (los
    // pares) son los que tienen que cuadrar; los `where` son la forma VIEJA, a
    // propósito, y por eso se comprueba que NO cuadran.
    const literales = literalesDe("docs/sql/2026-09-25-corregir-rutas-de-botones.sql");
    expect(literales).toHaveLength(4);
    expect(literales[0]).toEqual(JSON.parse(JSON.stringify(SECUENCIA_DENTAL)));
    expect(literales[2]).toEqual(JSON.parse(JSON.stringify(SECUENCIA_PSICOLOGIA)));
    expect(literales[1]).not.toEqual(literales[0]);
    expect(literales[3]).not.toEqual(literales[2]);
  });

  it("el refundido deja exactamente las dos plantillas", () => {
    expect(literalesDe("docs/sql/2026-09-24-refundir-secuencias-dinkbit.sql")).toEqual([
      JSON.parse(JSON.stringify(SECUENCIA_DENTAL)),
      JSON.parse(JSON.stringify(SECUENCIA_PSICOLOGIA)),
    ]);
  });
});
