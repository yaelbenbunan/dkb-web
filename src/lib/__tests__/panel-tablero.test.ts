import { describe, expect, test } from "vitest";
import { LEAD_STATUSES, type LeadStatus } from "../lead-status";
import {
  COLUMNAS_TABLERO,
  MAX_TARJETAS_COLUMNA,
  agruparEnColumnas,
  calcularPosicionMenu,
  columnaDeEstado,
  estadoSeguimiento,
  estadosDestino,
  iniciales,
  ordenarPorUrgencia,
  siguienteColumna,
} from "../panel-tablero";

const HOY = "2026-09-22";

describe("columnas del tablero", () => {
  test("seis columnas en orden, con Descartados al final", () => {
    expect(COLUMNAS_TABLERO.map((c) => c.id)).toEqual([
      "nuevo",
      "contactado",
      "propuesta",
      "ganado",
      "kit-digital",
      "descartados",
    ]);
    expect(COLUMNAS_TABLERO.map((c) => c.titulo)).toEqual([
      "Nuevo",
      "Contactado",
      "Propuesta",
      "Ganado",
      "Kit Digital",
      "Descartados",
    ]);
  });

  test("columnas de un solo estado tienen destino directo; las de varios, null", () => {
    const porId = (id: string) => COLUMNAS_TABLERO.find((c) => c.id === id)!;
    expect(porId("nuevo").estados).toEqual(["nuevo"]);
    expect(porId("nuevo").destino).toBe("nuevo");
    expect(porId("propuesta").destino).toBe("propuesta");
    expect(porId("ganado").destino).toBe("ganado");

    expect(porId("contactado").estados).toEqual(["contactado", "seguimiento"]);
    expect(porId("contactado").destino).toBeNull();
    expect(porId("kit-digital").estados).toEqual(["kit-digital", "cliente-kit-digital"]);
    expect(porId("kit-digital").destino).toBeNull();
    expect(porId("descartados").estados).toEqual(["ilocalizable", "perdido"]);
    expect(porId("descartados").destino).toBeNull();
  });

  test("cada uno de los 9 estados de lead-status está en exactamente una columna", () => {
    for (const estado of LEAD_STATUSES) {
      expect(COLUMNAS_TABLERO.filter((c) => c.estados.includes(estado))).toHaveLength(1);
    }
  });

  test("columnaDeEstado mapea cada estado a su columna", () => {
    expect(columnaDeEstado("nuevo")).toBe("nuevo");
    expect(columnaDeEstado("contactado")).toBe("contactado");
    expect(columnaDeEstado("seguimiento")).toBe("contactado");
    expect(columnaDeEstado("propuesta")).toBe("propuesta");
    expect(columnaDeEstado("ganado")).toBe("ganado");
    expect(columnaDeEstado("kit-digital")).toBe("kit-digital");
    expect(columnaDeEstado("cliente-kit-digital")).toBe("kit-digital");
    expect(columnaDeEstado("ilocalizable")).toBe("descartados");
    expect(columnaDeEstado("perdido")).toBe("descartados");
  });

  test("agrupar reparte los leads y mantiene el orden de entrada", () => {
    const leads: { id: string; estado: LeadStatus }[] = [
      { id: "1", estado: "nuevo" },
      { id: "2", estado: "perdido" },
      { id: "3", estado: "propuesta" },
      { id: "4", estado: "ilocalizable" },
      { id: "5", estado: "seguimiento" },
      { id: "6", estado: "contactado" },
      { id: "7", estado: "kit-digital" },
      { id: "8", estado: "cliente-kit-digital" },
      { id: "9", estado: "ganado" },
    ];
    const g = agruparEnColumnas(leads);
    expect(g.nuevo.map((l) => l.id)).toEqual(["1"]);
    expect(g.contactado.map((l) => l.id)).toEqual(["5", "6"]);
    expect(g.propuesta.map((l) => l.id)).toEqual(["3"]);
    expect(g.ganado.map((l) => l.id)).toEqual(["9"]);
    expect(g["kit-digital"].map((l) => l.id)).toEqual(["7", "8"]);
    expect(g.descartados.map((l) => l.id)).toEqual(["2", "4"]);
  });
});

describe("siguienteColumna", () => {
  test("avanza por el camino principal (Nuevo → Contactado → Propuesta → Ganado)", () => {
    expect(siguienteColumna("nuevo")).toBe("contactado");
    expect(siguienteColumna("contactado")).toBe("propuesta");
    expect(siguienteColumna("seguimiento")).toBe("propuesta");
    expect(siguienteColumna("propuesta")).toBe("ganado");
  });

  test("se para en Ganado y no avanza desde las columnas fuera del camino", () => {
    expect(siguienteColumna("ganado")).toBeNull();
    expect(siguienteColumna("kit-digital")).toBeNull();
    expect(siguienteColumna("cliente-kit-digital")).toBeNull();
    expect(siguienteColumna("ilocalizable")).toBeNull();
    expect(siguienteColumna("perdido")).toBeNull();
  });
});

describe("estadosDestino", () => {
  test("cualquier otro estado, en el orden de LEAD_STATUSES", () => {
    expect(estadosDestino("nuevo")).toEqual(LEAD_STATUSES.filter((s) => s !== "nuevo"));
    expect(estadosDestino("perdido")).toEqual(LEAD_STATUSES.filter((s) => s !== "perdido"));
    expect(estadosDestino("nuevo")).not.toContain("nuevo");
  });
});

describe("estadoSeguimiento", () => {
  test("atrasado, hoy o futuro en estados activos", () => {
    expect(estadoSeguimiento("2026-09-21", "contactado", HOY)).toBe("atrasado");
    expect(estadoSeguimiento("2026-09-22", "seguimiento", HOY)).toBe("hoy");
    expect(estadoSeguimiento("2026-09-23", "propuesta", HOY)).toBe("futuro");
    expect(estadoSeguimiento("2026-09-21", "nuevo", HOY)).toBe("atrasado");
    expect(estadoSeguimiento("2026-09-21", "kit-digital", HOY)).toBe("atrasado");
  });

  test("sin fecha o en estado cerrado no hay estado de seguimiento", () => {
    expect(estadoSeguimiento(null, "nuevo", HOY)).toBeNull();
    expect(estadoSeguimiento("2026-09-01", "ganado", HOY)).toBeNull();
    expect(estadoSeguimiento("2026-09-01", "perdido", HOY)).toBeNull();
    expect(estadoSeguimiento("2026-09-01", "ilocalizable", HOY)).toBeNull();
    expect(estadoSeguimiento("2026-09-01", "cliente-kit-digital", HOY)).toBeNull();
  });
});

describe("ordenarPorUrgencia", () => {
  test("atrasados (el más antiguo primero), luego hoy, luego el resto por fecha de alta descendente", () => {
    const l = (id: string, proximo: string | null, alta: string, estado: LeadStatus = "contactado") => ({
      id,
      estado,
      followup_at: proximo,
      created_at: alta,
    });
    const leads = [
      l("futuro-viejo", "2026-10-01", "2026-09-01T10:00:00Z"),
      l("sin-fecha-nuevo", null, "2026-09-15T10:00:00Z"),
      l("hoy", HOY, "2026-08-01T10:00:00Z"),
      l("atrasado-reciente", "2026-09-21", "2026-09-10T10:00:00Z"),
      l("atrasado-antiguo", "2026-09-05", "2026-09-11T10:00:00Z"),
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

describe("calcularPosicionMenu", () => {
  const VENTANA = { width: 1400, height: 900 };
  const LIMITE_SUPERIOR = 56;

  test("se abre debajo del botón, alineado a su borde derecho, si cabe", () => {
    const boton = { top: 200, bottom: 220, left: 300, right: 332 };
    const menu = { width: 190, height: 180 };
    expect(calcularPosicionMenu(boton, menu, VENTANA, LIMITE_SUPERIOR)).toEqual({ top: 224, left: 142 });
  });

  test("se abre hacia arriba si no cabe debajo", () => {
    const boton = { top: 800, bottom: 820, left: 300, right: 332 };
    const menu = { width: 190, height: 180 };
    expect(calcularPosicionMenu(boton, menu, VENTANA, LIMITE_SUPERIOR)).toEqual({ top: 616, left: 142 });
  });

  test("no sube nunca por encima del borde inferior de la cabecera", () => {
    const boton = { top: 60, bottom: 900, left: 300, right: 332 };
    const menu = { width: 190, height: 500 };
    expect(calcularPosicionMenu(boton, menu, VENTANA, LIMITE_SUPERIOR).top).toBe(LIMITE_SUPERIOR);
  });

  test("no se sale del viewport por la derecha ni por la izquierda", () => {
    const menu = { width: 190, height: 180 };
    const cercaDelBordeDerecho = { top: 200, bottom: 220, left: 1260, right: 1450 };
    expect(calcularPosicionMenu(cercaDelBordeDerecho, menu, VENTANA, LIMITE_SUPERIOR).left).toBe(VENTANA.width - menu.width);
    const cercaDelBordeIzquierdo = { top: 200, bottom: 220, left: 0, right: 20 };
    expect(calcularPosicionMenu(cercaDelBordeIzquierdo, menu, VENTANA, LIMITE_SUPERIOR).left).toBe(0);
  });
});

describe("iniciales", () => {
  test("primera letra del primer y último nombre, en mayúsculas", () => {
    expect(iniciales("Paula G")).toBe("PG");
    expect(iniciales("Yael")).toBe("Y");
    expect(iniciales("  Alicia  ")).toBe("A");
    expect(iniciales("")).toBe("");
  });
});
