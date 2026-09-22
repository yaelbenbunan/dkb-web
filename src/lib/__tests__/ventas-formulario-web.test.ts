import { describe, expect, test } from "vitest";
import {
  crearLimitador,
  esEnvioBot,
  notaFormulario,
  origenPermitido,
} from "../ventas/formulario-web";

describe("origenPermitido", () => {
  test("acepta los dominios de Hydrup", () => {
    expect(origenPermitido("hydrup", "https://drinkhydrup.com")).toBe(true);
    expect(origenPermitido("hydrup", "https://www.drinkhydrup.com")).toBe(true);
    expect(origenPermitido("hydrup", "https://drinkhydrup.myshopify.com")).toBe(true);
  });
  test("rechaza otros orígenes, marcas sin lista y origen ausente", () => {
    expect(origenPermitido("hydrup", "https://evil.com")).toBe(false);
    expect(origenPermitido("hydrup", "https://drinkhydrup.com.evil.com")).toBe(false);
    expect(origenPermitido("otra", "https://drinkhydrup.com")).toBe(false);
    expect(origenPermitido("hydrup", null)).toBe(false);
  });
});

describe("esEnvioBot", () => {
  test("el campo trampa relleno delata a un bot", () => {
    expect(esEnvioBot({ website_url: "http://spam" })).toBe(true);
  });
  test("vacío o ausente es una persona", () => {
    expect(esEnvioBot({ website_url: "" })).toBe(false);
    expect(esEnvioBot({ website_url: "   " })).toBe(false);
    expect(esEnvioBot({})).toBe(false);
  });
});

describe("notaFormulario", () => {
  test("junta socios, reparto y comentarios en líneas", () => {
    expect(
      notaFormulario({
        socios: "100-300",
        reparto: "Limón: 40 · Naranja: 60",
        comentarios: "Llamar por la tarde",
      }),
    ).toBe(
      "Desde la web (landing B2B).\nSocios: 100-300\nReparto: Limón: 40 · Naranja: 60\nComentarios: Llamar por la tarde",
    );
  });
  test("sin datos extra no hay nota", () => {
    expect(notaFormulario({ socios: "", comentarios: "  " })).toBeNull();
  });
  test("recorta textos largos a 1000 caracteres", () => {
    const nota = notaFormulario({ comentarios: "a".repeat(5000) })!;
    expect(nota.length).toBeLessThanOrEqual(1100);
  });
});

describe("crearLimitador", () => {
  test("permite max envíos por ventana y luego bloquea", () => {
    const permitir = crearLimitador({ max: 2, ventanaMs: 1000 });
    expect(permitir("ip1", 0)).toBe(true);
    expect(permitir("ip1", 10)).toBe(true);
    expect(permitir("ip1", 20)).toBe(false);
    expect(permitir("ip2", 20)).toBe(true);
  });
  test("la ventana caduca", () => {
    const permitir = crearLimitador({ max: 1, ventanaMs: 1000 });
    expect(permitir("ip1", 0)).toBe(true);
    expect(permitir("ip1", 500)).toBe(false);
    expect(permitir("ip1", 1001)).toBe(true);
  });
});
