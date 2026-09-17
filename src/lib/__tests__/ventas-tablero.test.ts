import { describe, expect, test } from "vitest";
import { FASES, type Fase } from "../ventas/dominio";
import {
  COLUMNAS_TABLERO,
  MAX_TARJETAS_COLUMNA,
  agruparEnColumnas,
  columnaDeFase,
  estadoSeguimiento,
  iniciales,
  ordenarPorUrgencia,
  siguienteFase,
} from "../ventas/tablero";

const HOY = "2026-09-17";

describe("columnas del tablero", () => {
  test("seis columnas en orden, con Descartados al final y sin destino único", () => {
    expect(COLUMNAS_TABLERO.map((c) => c.id)).toEqual(["nuevo", "contactado", "interesado", "muestras", "cliente", "descartados"]);
    expect(COLUMNAS_TABLERO.map((c) => c.titulo)).toEqual(["Nuevo", "Contactado", "Interesado", "Muestras enviadas", "Cliente", "Descartados"]);
    const descartados = COLUMNAS_TABLERO.find((c) => c.id === "descartados")!;
    expect(descartados.fases).toEqual(["perdido", "no_interesa", "ilocalizable"]);
    expect(descartados.destino).toBeNull();
    expect(COLUMNAS_TABLERO.find((c) => c.id === "muestras")!.destino).toBe("muestras");
  });

  test("cada fase está en exactamente una columna", () => {
    for (const fase of FASES) {
      expect(COLUMNAS_TABLERO.filter((c) => c.fases.includes(fase))).toHaveLength(1);
    }
    expect(columnaDeFase("nuevo")).toBe("nuevo");
    expect(columnaDeFase("cliente")).toBe("cliente");
    expect(columnaDeFase("perdido")).toBe("descartados");
    expect(columnaDeFase("no_interesa")).toBe("descartados");
    expect(columnaDeFase("ilocalizable")).toBe("descartados");
  });

  test("agrupar reparte los leads y Descartados junta las tres fases cerradas, manteniendo el orden", () => {
    const leads: { id: string; fase: Fase }[] = [
      { id: "1", fase: "nuevo" },
      { id: "2", fase: "perdido" },
      { id: "3", fase: "muestras" },
      { id: "4", fase: "ilocalizable" },
      { id: "5", fase: "nuevo" },
      { id: "6", fase: "no_interesa" },
    ];
    const g = agruparEnColumnas(leads);
    expect(g.nuevo.map((l) => l.id)).toEqual(["1", "5"]);
    expect(g.contactado).toEqual([]);
    expect(g.interesado).toEqual([]);
    expect(g.muestras.map((l) => l.id)).toEqual(["3"]);
    expect(g.cliente).toEqual([]);
    expect(g.descartados.map((l) => l.id)).toEqual(["2", "4", "6"]);
  });
});

describe("siguienteFase", () => {
  test("avanza por el camino principal y se para en Cliente y en las cerradas", () => {
    expect(siguienteFase("nuevo")).toBe("contactado");
    expect(siguienteFase("contactado")).toBe("interesado");
    expect(siguienteFase("interesado")).toBe("muestras");
    expect(siguienteFase("muestras")).toBe("cliente");
    expect(siguienteFase("cliente")).toBeNull();
    expect(siguienteFase("perdido")).toBeNull();
    expect(siguienteFase("no_interesa")).toBeNull();
    expect(siguienteFase("ilocalizable")).toBeNull();
  });
});

describe("estadoSeguimiento", () => {
  test("atrasado, hoy o futuro en fases activas", () => {
    expect(estadoSeguimiento("2026-09-16", "contactado", HOY)).toBe("atrasado");
    expect(estadoSeguimiento("2026-09-17", "interesado", HOY)).toBe("hoy");
    expect(estadoSeguimiento("2026-09-18", "muestras", HOY)).toBe("futuro");
  });

  test("sin fecha o en fase cerrada no hay estado", () => {
    expect(estadoSeguimiento(null, "nuevo", HOY)).toBeNull();
    expect(estadoSeguimiento("2026-09-01", "cliente", HOY)).toBeNull();
    expect(estadoSeguimiento("2026-09-01", "perdido", HOY)).toBeNull();
  });
});

describe("ordenarPorUrgencia", () => {
  test("atrasados (el más antiguo primero), luego hoy, luego el resto por fecha de alta descendente", () => {
    const l = (id: string, proximo: string | null, alta: string, fase: Fase = "contactado") => ({
      id,
      fase,
      proximo_seguimiento: proximo,
      created_at: alta,
    });
    const leads = [
      l("futuro-viejo", "2026-10-01", "2026-09-01T10:00:00Z"),
      l("sin-fecha-nuevo", null, "2026-09-15T10:00:00Z"),
      l("hoy", HOY, "2026-08-01T10:00:00Z"),
      l("atrasado-reciente", "2026-09-16", "2026-09-10T10:00:00Z"),
      l("atrasado-antiguo", "2026-09-02", "2026-09-11T10:00:00Z"),
      l("cerrado-con-fecha-pasada", "2026-09-01", "2026-09-12T10:00:00Z", "perdido"),
    ];
    const entrada = [...leads];
    expect(ordenarPorUrgencia(leads, HOY).map((x) => x.id)).toEqual([
      "atrasado-antiguo",
      "atrasado-reciente",
      "hoy",
      "sin-fecha-nuevo",
      "cerrado-con-fecha-pasada",
      "futuro-viejo",
    ]);
    expect(leads).toEqual(entrada);
  });

  test("límite de tarjetas por columna", () => {
    expect(MAX_TARJETAS_COLUMNA).toBe(50);
  });
});

describe("iniciales", () => {
  test("primera letra del primer y último nombre, en mayúsculas", () => {
    expect(iniciales("Paula Gómez")).toBe("PG");
    expect(iniciales("maría josé garcía lópez")).toBe("ML");
    expect(iniciales("  Álvaro  ")).toBe("Á");
    expect(iniciales("")).toBe("");
  });
});
