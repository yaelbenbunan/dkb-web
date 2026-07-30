import { describe, expect, test } from "vitest";
import { parseConsentAnswer, CONSENT_KEYS } from "../consent";

describe("parseConsentAnswer", () => {
  test("acepta las formas afirmativas que manda Meta según idioma y tipo de pregunta", () => {
    for (const v of ["true", "TRUE", "on", "yes", "Yes", "si", "sí", "SÍ", "1", " true "]) {
      expect(parseConsentAnswer(v)).toBe(true);
    }
  });

  test("acepta las formas negativas", () => {
    for (const v of ["false", "off", "no", "No", "NO", "0", " no "]) {
      expect(parseConsentAnswer(v)).toBe(false);
    }
  });

  test("ausencia o valor irreconocible → null, nunca true", () => {
    for (const v of [null, undefined, "", "   ", "quizá", "opt_in_unknown"]) {
      expect(parseConsentAnswer(v)).toBeNull();
    }
  });
});

describe("CONSENT_KEYS", () => {
  test("cubre el nombre recomendado y el que Zapier genera por defecto desde Meta", () => {
    // "disclaimer" es como Zapier nombra la respuesta del bloque de
    // consentimiento de Meta si no se renombra la clave a mano.
    expect(CONSENT_KEYS).toContain("consent");
    expect(CONSENT_KEYS).toContain("disclaimer");
  });
});
