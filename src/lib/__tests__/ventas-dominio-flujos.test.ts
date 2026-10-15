import { describe, expect, test } from "vitest";
import {
  emailDeResponsablePanel,
  esFaseActiva,
  faseDesdeEstadoPanel,
  FASE_LABELS,
  flujoDeMarca,
} from "../ventas/dominio";

describe("flujoDeMarca", () => {
  test("dinkbit: propuesta en vez de muestras", () => {
    const f = flujoDeMarca("dinkbit");
    expect(f.camino).toEqual(["nuevo", "contactado", "interesado", "propuesta", "cliente"]);
    expect(f.fases).toContain("propuesta");
    expect(f.fases).not.toContain("muestras");
    expect(f.conMuestras).toBe(false);
    expect(f.pasoAvanzado).toBe("propuesta");
  });

  test("cualquier otra marca: como hasta ahora, con muestras", () => {
    for (const slug of ["hydrup", "proveedores-deportivos", "otra"]) {
      const f = flujoDeMarca(slug);
      expect(f.camino).toEqual(["nuevo", "contactado", "interesado", "muestras", "cliente"]);
      expect(f.fases).not.toContain("propuesta");
      expect(f.conMuestras).toBe(true);
    }
  });

  test("propuesta cuenta como fase activa y tiene etiqueta", () => {
    expect(esFaseActiva("propuesta")).toBe(true);
    expect(FASE_LABELS.propuesta).toBe("Propuesta enviada");
  });
});

describe("correspondencias del /panel viejo", () => {
  test("estado → fase", () => {
    expect(faseDesdeEstadoPanel("seguimiento")).toBe("volver_a_llamar");
    expect(faseDesdeEstadoPanel("kit-digital")).toBe("interesado");
    expect(faseDesdeEstadoPanel("cliente-kit-digital")).toBe("cliente");
    expect(faseDesdeEstadoPanel("ganado")).toBe("cliente");
    expect(faseDesdeEstadoPanel("propuesta")).toBe("propuesta");
    expect(faseDesdeEstadoPanel("raro")).toBe("nuevo");
    expect(faseDesdeEstadoPanel(null)).toBe("nuevo");
  });

  test("responsable → email, sin mayúsculas ni espacios", () => {
    expect(emailDeResponsablePanel(" paula g ")).toBe("paula.garcia@dinkbit.com");
    expect(emailDeResponsablePanel("Yael")).toBe("yael.benbunan@dinkbit.com");
    expect(emailDeResponsablePanel("Alicia")).toBe("alicia.ruiz@dinkbit.com");
    expect(emailDeResponsablePanel("Paula L")).toBe("paula.lopez@dinkbit.com");
    expect(emailDeResponsablePanel("Otra")).toBeNull();
    expect(emailDeResponsablePanel(null)).toBeNull();
  });
});
