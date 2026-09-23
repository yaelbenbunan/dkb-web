import { describe, expect, it } from "vitest";
import { datosParaEmbudo } from "../promocion";

const lead = {
  id: "l1",
  negocio: "Panadería Sol",
  contacto: "Ana",
  telefono: "660415514",
  email: null,
  origen_detalle: "campana-web-express",
};

describe("datosParaEmbudo", () => {
  it("usa el contacto como nombre cuando lo hay", () => {
    expect(datosParaEmbudo(lead)).toEqual({
      name: "Ana",
      phone: "660415514",
      channel: "WhatsApp",
      campaign: "campana-web-express",
    });
  });

  it("cae al nombre del negocio si no hay contacto", () => {
    expect(datosParaEmbudo({ ...lead, contacto: null }).name).toBe("Panadería Sol");
  });

  it("si no hay ni contacto ni negocio, usa el teléfono", () => {
    expect(datosParaEmbudo({ ...lead, contacto: null, negocio: null }).name).toBe("660415514");
  });
});
