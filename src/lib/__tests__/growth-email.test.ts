import { describe, expect, test } from "vitest";
import { growthAutoresponder } from "../lead-emails";

describe("growthAutoresponder", () => {
  test("rama A: el email lleva su cifra por escrito", () => {
    const mail = growthAutoresponder({ name: "Ana", rama: "A", costePorPaciente: 88.24 });
    expect(mail.subject).toBeTruthy();
    expect(mail.intro).toContain("88,24");
    expect(mail.heading).toBeTruthy();
  });

  test("rama B: no inventa una cifra", () => {
    const mail = growthAutoresponder({ name: "Ana", rama: "B", costePorPaciente: null });
    // Cualquier dígito, no solo con coma decimal: "4000 €" también sería
    // inventarse una cifra y el regex anterior no lo habría detectado.
    expect(mail.intro).not.toMatch(/\d/);
    expect(mail.intro.toLowerCase()).toContain("no se puede calcular");
  });

  test("rama C: habla de empezar a medir, no de un coste", () => {
    const mail = growthAutoresponder({ name: "Ana", rama: "C", costePorPaciente: null });
    expect(mail.intro).not.toMatch(/\d/);
  });

  test("sin nombre no rompe", () => {
    expect(() =>
      growthAutoresponder({ name: null, rama: "A", costePorPaciente: 100 }),
    ).not.toThrow();
  });

  test("a quien viene de la portada no se le diagnostica nada", () => {
    // El formulario del hero manda las tres cifras en blanco para que el resto
    // del proceso funcione igual, y el cálculo lee ese vacío como «no
    // invierte». El correo le decía «todavía no inviertes en publicidad» a
    // alguien a quien nunca se le preguntó: no contestar y no ser preguntado
    // no son lo mismo.
    const mail = growthAutoresponder({
      name: "Ana",
      rama: "C",
      costePorPaciente: null,
      origen: "hero",
    });
    expect(mail.intro).not.toMatch(/inviertes|coste por paciente|no se puede calcular/i);
    expect(mail.subject).not.toMatch(/coste/i);
  });

  test("y el asunto habla de lo que ha pasado de verdad", () => {
    // «Tu coste por paciente» en la bandeja de alguien que solo ha dejado su
    // teléfono no se entiende, y lo que se abre es lo que se entiende.
    const mail = growthAutoresponder({ name: null, rama: "C", costePorPaciente: null, origen: "hero" });
    expect(mail.subject).toBe("Ya has dado el primer paso");
    // Sin lista de pasos: quien ha dejado su teléfono no ha pedido un proceso.
    expect(mail.bullets ?? []).toHaveLength(0);
    // Pero sí la salida rápida, por si no quiere esperar a la llamada.
    expect(mail.cta?.url).toBeTruthy();
  });

  test("quien SÍ ha usado la calculadora sigue recibiendo su resultado", () => {
    // Ahí las tres preguntas se hicieron y se contestaron: el valor del correo
    // es justamente devolverle la cifra por escrito.
    const mail = growthAutoresponder({
      name: "Ana", rama: "A", costePorPaciente: 88.24, origen: "calculadora",
    });
    expect(mail.intro).toMatch(/88/);
  });
});
