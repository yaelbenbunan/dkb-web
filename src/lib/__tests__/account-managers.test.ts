import { describe, expect, test } from "vitest";
import { ACCOUNT_MANAGERS, AM_COLORS } from "../account-managers";

describe("account managers", () => {
  test("Alicia puede recibir leads asignados", () => {
    expect(ACCOUNT_MANAGERS).toContain("Alicia");
  });

  test("cada responsable tiene su color de chip", () => {
    // Sin entrada en AM_COLORS el chip cae al gris de fallback y deja de
    // distinguirse del resto en el listado del panel.
    for (const am of ACCOUNT_MANAGERS) {
      expect(AM_COLORS[am]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  test("los colores no se repiten entre responsables", () => {
    const colors = ACCOUNT_MANAGERS.map((am) => AM_COLORS[am].toLowerCase());
    expect(new Set(colors).size).toBe(colors.length);
  });

  test("no hay nombres duplicados", () => {
    expect(new Set(ACCOUNT_MANAGERS).size).toBe(ACCOUNT_MANAGERS.length);
  });
});
