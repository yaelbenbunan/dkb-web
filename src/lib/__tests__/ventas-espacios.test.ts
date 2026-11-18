import { describe, expect, test } from "vitest";
import {
  colorDeCliente,
  esMarcaPropia,
  filtrarTareasGlobal,
  grupoDeSeccion,
  pestanasVisibles,
  separarPorEspacio,
  ubicacion,
} from "../ventas/espacios";

describe("esMarcaPropia", () => {
  test("solo dinkbit es lo nuestro", () => {
    expect(esMarcaPropia("dinkbit")).toBe(true);
    expect(esMarcaPropia("hydrup")).toBe(false);
    expect(esMarcaPropia("")).toBe(false);
  });
});

describe("grupoDeSeccion", () => {
  test("cada sección de dinkbit cae en su grupo del menú", () => {
    expect(grupoDeSeccion("resumen")).toBe("leads");
    expect(grupoDeSeccion("tablero")).toBe("leads");
    expect(grupoDeSeccion("leads")).toBe("leads");
    expect(grupoDeSeccion("tareas")).toBe("leads");
    expect(grupoDeSeccion("conversaciones")).toBe("conversaciones");
    expect(grupoDeSeccion("whatsapp")).toBe("conversaciones");
    expect(grupoDeSeccion("secuencias")).toBe("captacion");
    expect(grupoDeSeccion("campanas")).toBe("captacion");
    expect(grupoDeSeccion("prospeccion")).toBe("captacion");
    expect(grupoDeSeccion("condiciones")).toBeNull();
  });
});

describe("pestanasVisibles", () => {
  const base = { conCampanas: true };

  test("en dinkbit, solo las pestañas del grupo en el que estás", () => {
    expect(pestanasVisibles({ ...base, slug: "dinkbit", rol: "admin", activa: "tablero" })).toEqual(["resumen", "tablero", "leads", "tareas"]);
    expect(pestanasVisibles({ ...base, slug: "dinkbit", rol: "comercial", activa: "whatsapp" })).toEqual(["conversaciones", "whatsapp"]);
    expect(pestanasVisibles({ ...base, slug: "dinkbit", rol: "admin", activa: "prospeccion" })).toEqual(["secuencias", "campanas", "prospeccion"]);
  });

  test("dinkbit sin el módulo de campañas no enseña Mailing", () => {
    expect(pestanasVisibles({ slug: "dinkbit", rol: "admin", activa: "secuencias", conCampanas: false })).toEqual(["secuencias", "prospeccion"]);
  });

  test("las Condiciones de dinkbit son una página suelta de Ajustes: sin pestañas", () => {
    expect(pestanasVisibles({ ...base, slug: "dinkbit", rol: "admin", activa: "condiciones" })).toEqual([]);
  });

  test("ningún grupo de dinkbit enseña Condiciones", () => {
    for (const activa of ["tablero", "whatsapp", "secuencias"] as const) {
      expect(pestanasVisibles({ ...base, slug: "dinkbit", rol: "admin", activa })).not.toContain("condiciones");
    }
  });

  test("un cliente: una sola fila, sin Prospección, Mailing solo con el módulo", () => {
    expect(pestanasVisibles({ ...base, slug: "hydrup", rol: "admin", activa: "tablero" })).toEqual([
      "resumen", "tablero", "leads", "tareas", "conversaciones", "secuencias", "campanas", "condiciones", "whatsapp",
    ]);
    expect(pestanasVisibles({ slug: "hydrup", rol: "comercial", activa: "resumen", conCampanas: false })).not.toContain("campanas");
  });

  test("la clienta y la agente siguen con sus secciones de siempre", () => {
    expect(pestanasVisibles({ ...base, slug: "hydrup", rol: "cliente", activa: "resumen" })).toEqual([
      "resumen", "tablero", "leads", "tareas", "conversaciones", "whatsapp",
    ]);
    expect(pestanasVisibles({ ...base, slug: "hydrup", rol: "agente", activa: "conversaciones" })).toEqual(["conversaciones"]);
  });

  test("una clienta de dinkbit (si la hubiera) no se queda con los grupos: ve sus secciones", () => {
    expect(pestanasVisibles({ ...base, slug: "dinkbit", rol: "agente", activa: "conversaciones" })).toEqual(["conversaciones"]);
  });
});

describe("separarPorEspacio", () => {
  test("reparte por la marca de cada elemento, sin perder el orden", () => {
    const items = [
      { id: 1, slug: "hydrup" },
      { id: 2, slug: "dinkbit" },
      { id: 3, slug: null },
      { id: 4, slug: "dinkbit" },
    ];
    const r = separarPorEspacio(items, (i) => i.slug);
    expect(r.dinkbit.map((i) => i.id)).toEqual([2, 4]);
    // Sin marca conocida no es nuestro: va con los clientes para que no se pierda.
    expect(r.clientes.map((i) => i.id)).toEqual([1, 3]);
  });
});

describe("filtrarTareasGlobal", () => {
  const tareas = [
    { asignadaA: "yo", slug: "dinkbit" },
    { asignadaA: "otra", slug: "dinkbit" },
    { asignadaA: "yo", slug: "hydrup" },
    { asignadaA: null, slug: "nubosoft" },
  ];

  test("sin filtros, todas", () => {
    expect(filtrarTareasGlobal(tareas, { yo: "yo" })).toHaveLength(4);
  });
  test("ámbito dinkbit, o un cliente por su slug", () => {
    expect(filtrarTareasGlobal(tareas, { yo: "yo", ambito: "dinkbit" })).toHaveLength(2);
    expect(filtrarTareasGlobal(tareas, { yo: "yo", ambito: "hydrup" })).toEqual([{ asignadaA: "yo", slug: "hydrup" }]);
  });
  test("«clientes» son todas las que no son de dinkbit", () => {
    expect(filtrarTareasGlobal(tareas, { yo: "yo", ambito: "clientes" })).toHaveLength(2);
  });
  test("solo mías", () => {
    expect(filtrarTareasGlobal(tareas, { yo: "yo", soloMias: true })).toHaveLength(2);
    expect(filtrarTareasGlobal(tareas, { yo: "yo", soloMias: true, ambito: "dinkbit" })).toHaveLength(1);
  });
});

describe("ubicacion", () => {
  const marcas = [
    { slug: "dinkbit", nombre: "dinkbit" },
    { slug: "hydrup", nombre: "Hydrup" },
  ];

  test("personal: Mi día y Tareas", () => {
    expect(ubicacion("/panel/ventas/hoy", marcas)).toEqual({ espacio: "personal", menu: "hoy", migas: ["Mi día"] });
    expect(ubicacion("/panel/ventas/tareas", marcas)).toEqual({ espacio: "personal", menu: "tareas", migas: ["Tareas"] });
  });

  test("dinkbit: el grupo de la sección", () => {
    expect(ubicacion("/panel/ventas/dinkbit", marcas)).toEqual({ espacio: "dinkbit", menu: "dinkbit:leads", migas: ["Dinkbit", "Leads"] });
    expect(ubicacion("/panel/ventas/dinkbit/leads/abc", marcas)).toEqual({ espacio: "dinkbit", menu: "dinkbit:leads", migas: ["Dinkbit", "Leads"] });
    expect(ubicacion("/panel/ventas/dinkbit/whatsapp", marcas)).toEqual({ espacio: "dinkbit", menu: "dinkbit:conversaciones", migas: ["Dinkbit", "Conversaciones"] });
    expect(ubicacion("/panel/ventas/dinkbit/campanas/1", marcas)).toEqual({ espacio: "dinkbit", menu: "dinkbit:captacion", migas: ["Dinkbit", "Captación"] });
    expect(ubicacion("/panel/ventas/altas/xyz", marcas)).toEqual({ espacio: "dinkbit", menu: "altas", migas: ["Dinkbit", "Altas"] });
  });

  test("clientes: la lista y la carpeta de cada uno", () => {
    expect(ubicacion("/panel/ventas/clientes", marcas)).toEqual({ espacio: "clientes", menu: "clientes", migas: ["Clientes", "Todos"] });
    expect(ubicacion("/panel/ventas/hydrup", marcas)).toEqual({ espacio: "clientes", menu: "cliente:hydrup", migas: ["Clientes", "Hydrup", "Resumen"] });
    expect(ubicacion("/panel/ventas/hydrup/conversaciones", marcas)).toEqual({
      espacio: "clientes", menu: "cliente:hydrup", migas: ["Clientes", "Hydrup", "Conversaciones"],
    });
    expect(ubicacion("/panel/ventas/hydrup/leads/123", marcas)).toEqual({ espacio: "clientes", menu: "cliente:hydrup", migas: ["Clientes", "Hydrup", "Tabla"] });
  });

  test("ajustes: usuarios y las condiciones de dinkbit", () => {
    expect(ubicacion("/panel/ventas/usuarias", marcas)).toEqual({ espacio: "ajustes", menu: "usuarias", migas: ["Ajustes", "Usuarios"] });
    expect(ubicacion("/panel/ventas/dinkbit/condiciones", marcas)).toEqual({ espacio: "ajustes", menu: "dinkbit:ajustes", migas: ["Ajustes", "Dinkbit"] });
  });

  test("una marca que no está en la lista se nombra por su slug", () => {
    expect(ubicacion("/panel/ventas/otra/tablero", marcas).migas).toEqual(["Clientes", "otra", "Tablero"]);
  });
});

describe("colorDeCliente", () => {
  test("estable por slug y nunca el azul de dinkbit", () => {
    expect(colorDeCliente("hydrup")).toBe(colorDeCliente("hydrup"));
    for (const s of ["a", "hydrup", "nubosoft", "zz", "cliente-largo-de-prueba"]) expect(colorDeCliente(s)).not.toBe("#1557b8");
  });
});
