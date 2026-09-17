import { describe, expect, test } from "vitest";
import {
  faseTrasLlamada,
  seguimientoTrasLlamada,
  normalizarEmail,
  normalizarTelefono,
  normalizarCif,
  parseTipoNegocio,
  slugify,
  esFaseActiva,
} from "../ventas/dominio";

describe("faseTrasLlamada", () => {
  test("la primera llamada sin respuesta deja el lead como contactado", () => {
    expect(faseTrasLlamada("nuevo", "no_contesta")).toBe("contactado");
  });

  test("interesado y pide muestras llevan a interesado", () => {
    expect(faseTrasLlamada("contactado", "interesado")).toBe("interesado");
    expect(faseTrasLlamada("nuevo", "pide_muestras")).toBe("interesado");
  });

  test("una llamada normal no hace retroceder a quien ya tiene muestras", () => {
    expect(faseTrasLlamada("muestras", "volver_a_llamar")).toBe("muestras");
    expect(faseTrasLlamada("muestras", "interesado")).toBe("muestras");
  });

  test("los resultados negativos cierran el lead desde cualquier fase activa", () => {
    expect(faseTrasLlamada("muestras", "no_interesa")).toBe("no_interesa");
    expect(faseTrasLlamada("nuevo", "numero_erroneo")).toBe("ilocalizable");
  });

  test("un lead cerrado que vuelve a mostrar interés se reactiva", () => {
    expect(faseTrasLlamada("no_interesa", "interesado")).toBe("interesado");
  });

  test("un cliente sigue siendo cliente pase lo que pase en la llamada", () => {
    expect(faseTrasLlamada("cliente", "no_interesa")).toBe("cliente");
  });
});

describe("seguimientoTrasLlamada", () => {
  test("los resultados que cierran el lead borran el seguimiento", () => {
    expect(seguimientoTrasLlamada("no_interesa", "2026-09-20")).toBeNull();
    expect(seguimientoTrasLlamada("numero_erroneo", "2026-09-20")).toBeNull();
  });

  test("el resto conserva la fecha elegida", () => {
    expect(seguimientoTrasLlamada("volver_a_llamar", "2026-09-20")).toBe("2026-09-20");
  });
});

describe("normalización de contacto", () => {
  test("email en minúsculas y sin espacios; vacío es null", () => {
    expect(normalizarEmail("  Laura@Gym.ES ")).toBe("laura@gym.es");
    expect(normalizarEmail("  ")).toBeNull();
  });

  test("teléfono: últimos 9 dígitos, y null si no parece un teléfono", () => {
    expect(normalizarTelefono("+34 600 11 22 33")).toBe("600112233");
    expect(normalizarTelefono("600112233")).toBe("600112233");
    expect(normalizarTelefono("123")).toBeNull();
  });

  test("CIF en mayúsculas y sin guiones", () => {
    expect(normalizarCif("b-1234567.8")).toBe("B12345678");
    expect(normalizarCif("")).toBeNull();
  });
});

describe("parseTipoNegocio", () => {
  test("acepta el valor, la etiqueta y sinónimos habituales", () => {
    expect(parseTipoNegocio("gimnasio")).toBe("gimnasio");
    expect(parseTipoNegocio("Farmacia / parafarmacia")).toBe("farmacia");
    expect(parseTipoNegocio("Gym")).toBe("gimnasio");
    expect(parseTipoNegocio("CrossFit")).toBe("box_crossfit");
    expect(parseTipoNegocio("Fisio")).toBe("fisioterapia");
  });

  test("lo desconocido devuelve null", () => {
    expect(parseTipoNegocio("peluquería")).toBeNull();
    expect(parseTipoNegocio("")).toBeNull();
  });
});

describe("utilidades", () => {
  test("slugify quita acentos y signos", () => {
    expect(slugify("Hydrup Electrolitos")).toBe("hydrup-electrolitos");
    expect(slugify("  Café & Más ")).toBe("cafe-mas");
  });

  test("solo las fases activas tienen seguimiento", () => {
    expect(esFaseActiva("muestras")).toBe(true);
    expect(esFaseActiva("cliente")).toBe(false);
    expect(esFaseActiva("perdido")).toBe(false);
  });
});
