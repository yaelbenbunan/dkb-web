import { describe, expect, test } from "vitest";
import { BRIEFS, briefBySlug, briefBlocks, BASE_BLOCKS } from "../web-express-brief";
import { WEB_PSICOLOGOS, WEB_FISIOTERAPEUTAS, WEB_CLINICAS_ESTETICAS } from "../web-express-landings";

describe("cuestionarios por nicho", () => {
  test("hay uno por cada landing y comparten campaña", () => {
    // Si la campaña no coincide, el cuestionario crea un lead nuevo en vez de
    // enriquecer el que ya entró por la landing, y la ficha queda partida en dos.
    const landings = [WEB_PSICOLOGOS, WEB_FISIOTERAPEUTAS, WEB_CLINICAS_ESTETICAS];
    expect(BRIEFS).toHaveLength(landings.length);
    for (const l of landings) {
      const brief = BRIEFS.find((b) => b.slug === l.key);
      expect(brief, l.key).toBeDefined();
      expect(brief!.campaign, l.key).toBe(l.campaign);
    }
  });

  test("briefBySlug encuentra los tres y rechaza lo demás", () => {
    for (const b of BRIEFS) expect(briefBySlug(b.slug)?.slug).toBe(b.slug);
    expect(briefBySlug("dentistas")).toBeUndefined();
  });

  test("el bloque del nicho va entre los servicios y la identidad visual", () => {
    for (const b of BRIEFS) {
      const bloques = briefBlocks(b);
      const i = bloques.findIndex((x) => x.title === b.nicheBlock.title);
      expect(i, b.slug).toBe(BASE_BLOCKS.length);
    }
  });

  test("no hay dos campos con el mismo nombre dentro de un cuestionario", () => {
    // Dos campos homónimos harían que uno pisara al otro al recoger el FormData.
    for (const b of BRIEFS) {
      const nombres = briefBlocks(b).flatMap((x) => x.fields.map((f) => f.name));
      expect(new Set(nombres).size, b.slug).toBe(nombres.length);
    }
  });

  test("las preguntas de cada nicho son propias, no las mismas con otro título", () => {
    const firmas = BRIEFS.map((b) => b.nicheBlock.fields.map((f) => f.label).join("|"));
    expect(new Set(firmas).size).toBe(BRIEFS.length);
  });

  test("todo campo de opción múltiple trae opciones", () => {
    for (const b of BRIEFS) {
      for (const bloque of briefBlocks(b)) {
        for (const f of bloque.fields) {
          if (f.type === "radio" || f.type === "checkbox") {
            expect(f.options?.length, `${b.slug}/${f.name}`).toBeGreaterThan(1);
          }
        }
      }
    }
  });
});
