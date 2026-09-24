import { describe, expect, it } from "vitest";
import { TIPOS_NEGOCIO, TIPO_NEGOCIO_LABELS, tiposNegocioDeMarca } from "../ventas/dominio";

describe("tiposNegocioDeMarca", () => {
  it("ofrece a dinkbit tipos de clínica, no de gimnasio", () => {
    const tipos = tiposNegocioDeMarca("dinkbit");
    expect(tipos).toContain("clinica_dental");
    expect(tipos).toContain("psicologia");
    expect(tipos).not.toContain("gimnasio");
    expect(tipos).not.toContain("herbolario");
  });

  it("ofrece el catálogo entero a una marca que no tiene lista propia", () => {
    expect(tiposNegocioDeMarca("hydrup")).toEqual(TIPOS_NEGOCIO);
    expect(tiposNegocioDeMarca("una-marca-nueva")).toEqual(TIPOS_NEGOCIO);
  });

  it("solo devuelve tipos del catálogo, para que la validación los acepte", () => {
    for (const slug of ["dinkbit", "hydrup"]) {
      for (const tipo of tiposNegocioDeMarca(slug)) {
        expect(TIPOS_NEGOCIO).toContain(tipo);
      }
    }
  });

  it("todo tipo del catálogo tiene etiqueta", () => {
    for (const tipo of TIPOS_NEGOCIO) {
      expect(TIPO_NEGOCIO_LABELS[tipo]).toBeTruthy();
    }
  });
});
