import { describe, expect, test } from "vitest";
import { consentimientoVigente, fechaLarga, GUION_LLAMADA, validarConsentimiento } from "../consentimiento";

describe("consentimientoVigente", () => {
  test("solo con fecha de consentimiento y sin retirar", () => {
    expect(consentimientoVigente({ consentimiento_at: "2026-10-19T10:00:00Z", consentimiento_retirado_at: null })).toBe(true);
    expect(consentimientoVigente({ consentimiento_at: null, consentimiento_retirado_at: null })).toBe(false);
    expect(
      consentimientoVigente({ consentimiento_at: "2026-10-19T10:00:00Z", consentimiento_retirado_at: "2026-10-20T10:00:00Z" }),
    ).toBe(false);
  });

  test("sin las columnas (migración sin ejecutar) nadie tiene consentimiento", () => {
    expect(consentimientoVigente({})).toBe(false);
  });
});

describe("fechaLarga", () => {
  test("en español y en hora de Madrid", () => {
    expect(fechaLarga("2026-10-19T08:00:00Z")).toBe("19 de octubre de 2026");
    // 23:30 UTC del 31 ya es 1 de noviembre en Madrid.
    expect(fechaLarga("2026-10-31T23:30:00Z")).toBe("1 de noviembre de 2026");
    expect(fechaLarga("no")).toBeNull();
    expect(fechaLarga(null)).toBeNull();
  });
});

describe("validarConsentimiento", () => {
  test("limpia el email y la nota", () => {
    expect(validarConsentimiento(" Info@Bar.es ", "  llamada con la recepcionista ")).toEqual({
      ok: true,
      email: "info@bar.es",
      nota: "llamada con la recepcionista",
    });
    expect(validarConsentimiento("info@bar.es", "   ")).toEqual({ ok: true, email: "info@bar.es", nota: null });
  });

  test("sin un email válido no se guarda", () => {
    for (const malo of ["", "  ", "bar.es", "a@b", "a b@bar.es"]) {
      expect(validarConsentimiento(malo, "")).toEqual({ ok: false, error: "Escribe el email al que quiere que le escribamos." });
    }
  });

  test("la nota se recorta a 300 caracteres", () => {
    const r = validarConsentimiento("info@bar.es", "x".repeat(400));
    expect(r.ok && r.nota?.length).toBe(300);
  });
});

describe("GUION_LLAMADA", () => {
  test("dice quién llama, de dónde sale el teléfono, para qué y lo de la Lista Robinson", () => {
    const texto = GUION_LLAMADA.join(" ");
    expect(texto).toContain("dinkbit");
    expect(texto).toMatch(/directorios públicos/);
    expect(texto).toMatch(/Lista Robinson/);
    expect(texto).toMatch(/autónomo/);
  });
});
