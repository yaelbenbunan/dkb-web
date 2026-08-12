import { describe, expect, test } from "vitest";
import {
  WEB_PSICOLOGOS,
  WEB_FISIOTERAPEUTAS,
  WEB_CLINICAS_ESTETICAS,
  WEB_EXPRESS_PRICE,
  type WebExpressLanding,
} from "../web-express-landings";

const LANDINGS: WebExpressLanding[] = [
  WEB_PSICOLOGOS,
  WEB_FISIOTERAPEUTAS,
  WEB_CLINICAS_ESTETICAS,
];

describe("landings por nicho", () => {
  test("cada una tiene su ruta, su origen y su campaña, sin repetirse", () => {
    // Si dos comparten campaña, los leads de ambas caen en el mismo saco y ya
    // no se puede saber qué anuncio funciona.
    for (const campo of ["path", "origin", "campaign", "key"] as const) {
      const valores = LANDINGS.map((l) => l[campo]);
      expect(new Set(valores).size, campo).toBe(LANDINGS.length);
    }
  });

  test("la ruta y la canónica de los metadatos coinciden", () => {
    for (const l of LANDINGS) {
      expect(l.path.startsWith("/web-para-"), l.key).toBe(true);
      expect(l.metaTitle).toContain(WEB_EXPRESS_PRICE);
    }
  });

  test("ninguna se queda a medias al añadir un nicho nuevo", () => {
    for (const l of LANDINGS) {
      expect(l.pains.length, l.key).toBeGreaterThanOrEqual(3);
      expect(l.includes.length, l.key).toBeGreaterThanOrEqual(5);
      expect(l.excludes.length, l.key).toBeGreaterThanOrEqual(4);
      expect(l.steps.length, l.key).toBe(4);
      expect(l.faqs.length, l.key).toBeGreaterThanOrEqual(5);
      expect(l.heroBullets.length, l.key).toBe(3);
      for (const p of l.pains) {
        expect(p.problem.length, l.key).toBeGreaterThan(10);
        expect(p.answer.length, l.key).toBeGreaterThan(10);
      }
    }
  });

  test("el copy es propio de cada nicho, no un buscar y reemplazar", () => {
    // Si dos landings compartieran los dolores, no habría identificación con el
    // nicho y el anuncio rendiría como uno genérico.
    const problemas = LANDINGS.map((l) => l.pains.map((p) => p.problem).join("|"));
    expect(new Set(problemas).size).toBe(LANDINGS.length);
  });

  test("todas dejan la agenda online fuera del precio cerrado", () => {
    // Es lo que piden los tres nichos y lo que se llevaría el margen si se diera
    // por incluido.
    for (const l of LANDINGS) {
      expect(l.excludes.some((e) => /agenda|cita online/i.test(e)), l.key).toBe(true);
    }
  });
});
