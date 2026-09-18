import { describe, expect, test } from "vitest";
import { FASES, type Fase } from "../ventas/dominio";
import {
  COLUMNAS_TABLERO,
  FASES_MOVIBLES,
  MAX_TARJETAS_COLUMNA,
  agruparEnColumnas,
  calcularPosicionMenu,
  columnaDeFase,
  estadoSeguimiento,
  fasesDestino,
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

describe("fasesDestino", () => {
  test("las cinco fases movibles salvo la actual, en el orden del camino principal", () => {
    expect(fasesDestino("nuevo")).toEqual(["contactado", "interesado", "muestras", "cliente"]);
    expect(fasesDestino("interesado")).toEqual(["nuevo", "contactado", "muestras", "cliente"]);
    expect(fasesDestino("cliente")).toEqual(["nuevo", "contactado", "interesado", "muestras"]);
  });

  test("un lead descartado puede recuperarse a cualquier fase movible", () => {
    expect(fasesDestino("perdido")).toEqual(FASES_MOVIBLES);
    expect(fasesDestino("no_interesa")).toEqual(FASES_MOVIBLES);
    expect(fasesDestino("ilocalizable")).toEqual(FASES_MOVIBLES);
  });
});

describe("calcularPosicionMenu", () => {
  const VENTANA = { width: 1400, height: 900 };
  const LIMITE_SUPERIOR = 56; // borde inferior de la cabecera fija

  test("se abre debajo del botón, alineado a su borde derecho, si cabe", () => {
    const boton = { top: 200, bottom: 220, left: 300, right: 332 };
    const menu = { width: 190, height: 180 };
    expect(calcularPosicionMenu(boton, menu, VENTANA, LIMITE_SUPERIOR)).toEqual({ top: 224, left: 142 });
  });

  test("se abre hacia arriba si no cabe debajo", () => {
    const boton = { top: 800, bottom: 820, left: 300, right: 332 };
    const menu = { width: 190, height: 180 };
    // 820 + 4 + 180 = 1004 > 900 → no cabe debajo; arriba: 800 - 4 - 180 = 616
    expect(calcularPosicionMenu(boton, menu, VENTANA, LIMITE_SUPERIOR)).toEqual({ top: 616, left: 142 });
  });

  test("no sube nunca por encima del borde inferior de la cabecera", () => {
    const boton = { top: 60, bottom: 900, left: 300, right: 332 };
    const menu = { width: 190, height: 500 };
    // Ni cabe debajo (900+4+500) ni arriba (60-4-500 sería negativo): se pega a la cabecera.
    expect(calcularPosicionMenu(boton, menu, VENTANA, LIMITE_SUPERIOR).top).toBe(LIMITE_SUPERIOR);
  });

  test("no se sale del viewport por la derecha ni por la izquierda", () => {
    const menu = { width: 190, height: 180 };
    // El botón sobresale del viewport por la derecha (p. ej. redondeos de un contenedor con scroll).
    const cercaDelBordeDerecho = { top: 200, bottom: 220, left: 1260, right: 1450 };
    expect(calcularPosicionMenu(cercaDelBordeDerecho, menu, VENTANA, LIMITE_SUPERIOR).left).toBe(VENTANA.width - menu.width);

    const cercaDelBordeIzquierdo = { top: 200, bottom: 220, left: 0, right: 20 };
    expect(calcularPosicionMenu(cercaDelBordeIzquierdo, menu, VENTANA, LIMITE_SUPERIOR).left).toBe(0);
  });

  test("no se sale del viewport por abajo ni siquiera abriendo hacia arriba", () => {
    // El botón queda por debajo del viewport (tarjeta a medio desplazar): no cabe debajo
    // ni, al abrir hacia arriba, deja de sobresalir por abajo. Se pega al borde inferior.
    const boton = { top: 950, bottom: 970, left: 300, right: 332 };
    const menu = { width: 190, height: 60 };
    expect(calcularPosicionMenu(boton, menu, VENTANA, LIMITE_SUPERIOR)).toEqual({ top: 840, left: 142 });
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
