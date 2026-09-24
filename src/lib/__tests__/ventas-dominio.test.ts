import { describe, expect, it } from "vitest";
import {
  FASES,
  FASE_COLORES,
  FASE_LABELS,
  TIPOS_NEGOCIO,
  TIPO_NEGOCIO_LABELS,
  esFaseActiva,
  faseTrasLlamada,
  tiposNegocioDeMarca,
} from "../ventas/dominio";

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

describe("fases nuevas", () => {
  it("«Volver a llamar» es fase activa: conserva el seguimiento", () => {
    expect(FASES).toContain("volver_a_llamar");
    expect(esFaseActiva("volver_a_llamar")).toBe(true);
  });

  it("«Fuera de perfil» no es activa: el lead ya no se trabaja", () => {
    expect(FASES).toContain("fuera_de_perfil");
    expect(esFaseActiva("fuera_de_perfil")).toBe(false);
  });

  it("registrar «volver a llamar» lleva el lead a esa fase, venga de donde venga", () => {
    // Es un estado lateral, no un paso del embudo: por eso gana también sobre
    // fases más avanzadas. Sacarlo de ahí es decisión manual de la comercial.
    expect(faseTrasLlamada("nuevo", "volver_a_llamar")).toBe("volver_a_llamar");
    expect(faseTrasLlamada("contactado", "volver_a_llamar")).toBe("volver_a_llamar");
    expect(faseTrasLlamada("interesado", "volver_a_llamar")).toBe("volver_a_llamar");
  });

  it("no toca a un cliente, como el resto de resultados", () => {
    expect(faseTrasLlamada("cliente", "volver_a_llamar")).toBe("cliente");
  });

  it("las dos fases nuevas tienen etiqueta y color", () => {
    for (const fase of ["volver_a_llamar", "fuera_de_perfil"] as const) {
      expect(FASE_LABELS[fase]).toBeTruthy();
      expect(FASE_COLORES[fase]).toBeTruthy();
    }
  });
});
