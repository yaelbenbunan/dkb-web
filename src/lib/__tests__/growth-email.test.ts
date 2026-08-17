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
    expect(mail.intro).not.toMatch(/\d+,\d+\s*€/);
    expect(mail.intro.toLowerCase()).toContain("no se puede calcular");
  });

  test("rama C: habla de empezar a medir, no de un coste", () => {
    const mail = growthAutoresponder({ name: "Ana", rama: "C", costePorPaciente: null });
    expect(mail.intro).not.toMatch(/\d+,\d+\s*€/);
  });

  test("sin nombre no rompe", () => {
    expect(() =>
      growthAutoresponder({ name: null, rama: "A", costePorPaciente: 100 }),
    ).not.toThrow();
  });
});
