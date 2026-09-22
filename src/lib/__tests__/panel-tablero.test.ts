import { describe, expect, test } from "vitest";
import { LEAD_STATUSES, type LeadStatus } from "../lead-status";
import {
  COLUMNAS_TABLERO,
  ESTADOS_FUERA_DEL_TABLERO,
  MAX_TARJETAS_COLUMNA,
  agruparEnColumnas,
  calcularPosicionMenu,
  columnaDeEstado,
  estadoSeguimiento,
  estadosDestino,
  saleDelTablero,
  iniciales,
  ordenarPorUrgencia,
  siguienteColumna,
} from "../panel-tablero";

const HOY = "2026-09-22";

describe("columnas del tablero", () => {
  test("cinco columnas en orden, con Descartados al final y sin Kit Digital", () => {
    expect(COLUMNAS_TABLERO.map((c) => c.id)).toEqual([
      "nuevo",
      "contactado",
      "propuesta",
      "ganado",
      "descartados",
    ]);
    expect(COLUMNAS_TABLERO.map((c) => c.titulo)).toEqual([
      "Nuevo",
      "Contactado",
      "Propuesta",
      "Ganado",
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
    expect(porId("descartados").estados).toEqual(["ilocalizable", "perdido"]);
    expect(porId("descartados").destino).toBeNull();
  });

  test("kit-digital y cliente-kit-digital ya no tienen columna en el tablero", () => {
    expect(ESTADOS_FUERA_DEL_TABLERO).toEqual(["kit-digital", "cliente-kit-digital"]);
    for (const estado of ESTADOS_FUERA_DEL_TABLERO) {
      expect(COLUMNAS_TABLERO.some((c) => c.estados.includes(estado))).toBe(false);
    }
  });

  test("cada uno de los 9 estados de lead-status está en, como mucho, una columna", () => {
    for (const estado of LEAD_STATUSES) {
      const enColumnas = COLUMNAS_TABLERO.filter((c) => c.estados.includes(estado));
      expect(enColumnas).toHaveLength(ESTADOS_FUERA_DEL_TABLERO.includes(estado) ? 0 : 1);
    }
  });

  test("columnaDeEstado mapea cada estado a su columna, y null en los que no tienen", () => {
    expect(columnaDeEstado("nuevo")).toBe("nuevo");
    expect(columnaDeEstado("contactado")).toBe("contactado");
    expect(columnaDeEstado("seguimiento")).toBe("contactado");
    expect(columnaDeEstado("propuesta")).toBe("propuesta");
    expect(columnaDeEstado("ganado")).toBe("ganado");
    expect(columnaDeEstado("ilocalizable")).toBe("descartados");
    expect(columnaDeEstado("perdido")).toBe("descartados");
    expect(columnaDeEstado("kit-digital")).toBeNull();
    expect(columnaDeEstado("cliente-kit-digital")).toBeNull();
  });

  test("agrupar reparte los leads, descarta los de Kit Digital y mantiene el orden de entrada", () => {
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
    expect(g.descartados.map((l) => l.id)).toEqual(["2", "4"]);
    expect(Object.keys(g)).not.toContain("kit-digital");
    // Los leads de Kit Digital no aparecen en ninguna columna: la suma de
    // todas las columnas es de 7, no de los 9 leads de entrada.
    expect(Object.values(g).reduce((n, arr) => n + arr.length, 0)).toBe(7);
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
  test("todos los demás estados, en el orden de LEAD_STATUSES", () => {
    const otros = (s: LeadStatus) => LEAD_STATUSES.filter((x) => x !== s);
    expect(estadosDestino("nuevo")).toEqual(otros("nuevo"));
    expect(estadosDestino("perdido")).toEqual(otros("perdido"));
    expect(estadosDestino("nuevo")).not.toContain("nuevo");
  });

  test("deja mandar a Kit Digital aunque no tenga columna", () => {
    for (const estado of LEAD_STATUSES) {
      if (estado !== "kit-digital") expect(estadosDestino(estado)).toContain("kit-digital");
      if (estado !== "cliente-kit-digital") expect(estadosDestino(estado)).toContain("cliente-kit-digital");
    }
  });
});

describe("saleDelTablero", () => {
  test("solo los estados de Kit Digital sacan la tarjeta del tablero", () => {
    expect(saleDelTablero("kit-digital")).toBe(true);
    expect(saleDelTablero("cliente-kit-digital")).toBe(true);
    expect(saleDelTablero("nuevo")).toBe(false);
    expect(saleDelTablero("perdido")).toBe(false);
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
