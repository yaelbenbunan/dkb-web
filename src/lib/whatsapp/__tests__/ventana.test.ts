import { describe, expect, it } from "vitest";
import { calcularVentana, telefonoDeWaId, ventanaAbierta } from "../ventana";

const EN = (iso: string) => new Date(iso);

describe("calcularVentana", () => {
  it("da 24 horas a un mensaje normal", () => {
    expect(calcularVentana(EN("2026-09-23T10:00:00Z"), false).toISOString()).toBe(
      "2026-09-24T10:00:00.000Z",
    );
  });

  it("da 72 horas a uno que viene de un anuncio", () => {
    expect(calcularVentana(EN("2026-09-23T10:00:00Z"), true).toISOString()).toBe(
      "2026-09-26T10:00:00.000Z",
    );
  });
});

describe("ventanaAbierta", () => {
  it("está abierta antes de caducar y cerrada justo al caducar", () => {
    const hasta = "2026-09-24T10:00:00.000Z";
    expect(ventanaAbierta(hasta, EN("2026-09-24T09:59:59Z"))).toBe(true);
    expect(ventanaAbierta(hasta, EN("2026-09-24T10:00:00Z"))).toBe(false);
  });

  it("sin ventana registrada está cerrada", () => {
    expect(ventanaAbierta(null, EN("2026-09-23T10:00:00Z"))).toBe(false);
  });
});

describe("telefonoDeWaId", () => {
  it("saca el teléfono español de un wa_id con prefijo", () => {
    expect(telefonoDeWaId("34660415514")).toBe("660415514");
  });

  it("no casa números demasiado cortos", () => {
    expect(telefonoDeWaId("1234")).toBeNull();
  });

  // Review Focus 4: dos extranjeros distintos no pueden colapsar en el mismo lead.
  it("distingue números extranjeros que comparten cola", () => {
    expect(telefonoDeWaId("15551234567")).not.toBe(telefonoDeWaId("445551234567"));
  });
});
