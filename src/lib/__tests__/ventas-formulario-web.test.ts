import { describe, expect, test } from "vitest";
import {
  avisoFormulario,
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

describe("avisoFormulario", () => {
  test("Hydrup recibe en info@ todo lo que mandó el formulario", () => {
    const aviso = avisoFormulario("hydrup", {
      negocio: "Gym Prueba",
      contacto: "Ana Ruiz",
      telefono: "600 111 222",
      email: "ana@gym.es",
      ciudad: "Madrid",
      cif: "B12345678",
      comentarios: "SOLICITUD DE MUESTRAS\nDirección: Calle Mayor 1, 28001 Madrid",
    });
    expect(aviso?.to).toEqual(["info@drinkhydrup.com"]);
    expect(aviso?.subject).toBe("Formulario web (landing B2B) — Gym Prueba");
    expect(aviso?.replyTo).toBe("ana@gym.es");
    expect(aviso?.text).toBe(
      [
        "Centro: Gym Prueba",
        "Contacto: Ana Ruiz",
        "Teléfono: 600 111 222",
        "Email: ana@gym.es",
        "Ciudad: Madrid",
        "CIF: B12345678",
        "",
        "SOLICITUD DE MUESTRAS",
        "Dirección: Calle Mayor 1, 28001 Madrid",
      ].join("\n"),
    );
  });
  test("sin email válido no hay a quién responder", () => {
    expect(avisoFormulario("hydrup", { negocio: "Gym", telefono: "600111222" })?.replyTo).toBeUndefined();
    expect(avisoFormulario("hydrup", { negocio: "Gym", email: "no-es-email" })?.replyTo).toBeUndefined();
  });
  test("una marca sin destinatarios no manda nada", () => {
    expect(avisoFormulario("otra", { negocio: "Gym" })).toBeNull();
  });
});
