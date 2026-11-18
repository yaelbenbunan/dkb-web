import { describe, expect, test } from "vitest";
import {
  alternarAnclado,
  cabeceraMarca,
  clientesDelMenu,
  colorDeCliente,
  esMarcaPropia,
  filtrarTareasGlobal,
  grupoDeSeccion,
  rutaSeccion,
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
  test("dinkbit: Leads, WhatsApp y Captación", () => {
    expect(grupoDeSeccion("dinkbit", "tablero")?.clave).toBe("leads");
    expect(grupoDeSeccion("dinkbit", "tareas")?.clave).toBe("leads");
    expect(grupoDeSeccion("dinkbit", "whatsapp")?.clave).toBe("whatsapp");
    expect(grupoDeSeccion("dinkbit", "secuencias")?.clave).toBe("whatsapp");
    expect(grupoDeSeccion("dinkbit", "prospeccion")?.clave).toBe("captacion");
    expect(grupoDeSeccion("dinkbit", "condiciones")).toBeNull();
  });
  test("un cliente: Ficha, Tareas, Leads, WhatsApp e Integraciones", () => {
    expect(grupoDeSeccion("hydrup", "ficha")?.clave).toBe("ficha");
    expect(grupoDeSeccion("hydrup", "tareas")?.clave).toBe("tareas");
    expect(grupoDeSeccion("hydrup", "campanas")?.clave).toBe("leads");
    expect(grupoDeSeccion("hydrup", "secuencias")?.clave).toBe("whatsapp");
    expect(grupoDeSeccion("hydrup", "condiciones")?.texto).toBe("Integraciones");
  });
});

describe("rutaSeccion", () => {
  test("el resumen es la raíz de la marca", () => {
    expect(rutaSeccion("hydrup", "resumen")).toBe("/panel/hydrup");
    expect(rutaSeccion("hydrup", "ficha")).toBe("/panel/hydrup/ficha");
  });
});

describe("cabeceraMarca", () => {
  const base = { conCampanas: true };
  const claves = (c: ReturnType<typeof cabeceraMarca>) => c.grupos.map((g) => g.clave);

  test("un cliente: los cinco grupos y, en Leads o WhatsApp, sus secciones", () => {
    const c = cabeceraMarca({ ...base, slug: "hydrup", rol: "admin", activa: "tablero" });
    expect(claves(c)).toEqual(["ficha", "tareas", "leads", "whatsapp", "integraciones"]);
    expect(c.grupos.find((g) => g.activo)?.clave).toBe("leads");
    expect(c.secciones).toEqual(["resumen", "tablero", "leads", "campanas"]);
    expect(cabeceraMarca({ ...base, slug: "hydrup", rol: "admin", activa: "secuencias" }).secciones).toEqual(["conversaciones", "whatsapp", "secuencias"]);
  });

  test("un grupo de una sola sección no lleva segundo nivel", () => {
    expect(cabeceraMarca({ ...base, slug: "hydrup", rol: "comercial", activa: "ficha" }).secciones).toEqual([]);
  });

  test("cada grupo lleva a su primera sección visible", () => {
    const c = cabeceraMarca({ ...base, slug: "hydrup", rol: "admin", activa: "ficha" });
    expect(Object.fromEntries(c.grupos.map((g) => [g.clave, g.seccion]))).toEqual({
      ficha: "ficha", tareas: "tareas", leads: "resumen", whatsapp: "conversaciones", integraciones: "condiciones",
    });
  });

  test("Mailing solo con el módulo; Prospección nunca en un cliente", () => {
    expect(cabeceraMarca({ slug: "hydrup", rol: "admin", activa: "resumen", conCampanas: false }).secciones).toEqual(["resumen", "tablero", "leads"]);
  });

  test("dinkbit: sin primer nivel (lo hace el menú lateral), solo las secciones del grupo", () => {
    const c = cabeceraMarca({ ...base, slug: "dinkbit", rol: "admin", activa: "whatsapp" });
    expect(c.grupos).toEqual([]);
    expect(c.secciones).toEqual(["conversaciones", "whatsapp", "secuencias"]);
    expect(cabeceraMarca({ ...base, slug: "dinkbit", rol: "comercial", activa: "prospeccion" }).secciones).toEqual(["campanas", "prospeccion"]);
  });

  test("las Condiciones de dinkbit son una página suelta de Ajustes", () => {
    expect(cabeceraMarca({ ...base, slug: "dinkbit", rol: "admin", activa: "condiciones" })).toEqual({ grupos: [], secciones: [] });
  });

  test("la clienta: sin Ficha ni Integraciones, y solo sus secciones", () => {
    const c = cabeceraMarca({ ...base, slug: "hydrup", rol: "cliente", activa: "conversaciones" });
    expect(claves(c)).toEqual(["tareas", "leads", "whatsapp"]);
    expect(c.secciones).toEqual(["conversaciones", "whatsapp"]);
    expect(cabeceraMarca({ ...base, slug: "hydrup", rol: "cliente", activa: "resumen" }).secciones).toEqual(["resumen", "tablero", "leads"]);
  });

  test("la agente: solo Conversaciones, sin pestañas de más", () => {
    const c = cabeceraMarca({ ...base, slug: "hydrup", rol: "agente", activa: "conversaciones" });
    expect(claves(c)).toEqual(["whatsapp"]);
    expect(c.secciones).toEqual([]);
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
    expect(ubicacion("/panel/hoy", marcas)).toEqual({ espacio: "personal", menu: "hoy", migas: ["Mi día"] });
    expect(ubicacion("/panel/tareas", marcas)).toEqual({ espacio: "personal", menu: "tareas", migas: ["Tareas"] });
    expect(ubicacion("/panel", marcas).menu).toBe("hoy");
  });

  test("dinkbit: el grupo y la sección", () => {
    expect(ubicacion("/panel/dinkbit/tablero", marcas)).toEqual({ espacio: "dinkbit", menu: "dinkbit:leads", migas: ["Dinkbit", "Leads", "Tablero"] });
    expect(ubicacion("/panel/dinkbit/leads/abc", marcas).migas).toEqual(["Dinkbit", "Leads", "Tabla"]);
    expect(ubicacion("/panel/dinkbit/secuencias/7", marcas)).toEqual({ espacio: "dinkbit", menu: "dinkbit:whatsapp", migas: ["Dinkbit", "WhatsApp", "Secuencias"] });
    expect(ubicacion("/panel/dinkbit/campanas", marcas).menu).toBe("dinkbit:captacion");
    expect(ubicacion("/panel/altas/xyz", marcas)).toEqual({ espacio: "dinkbit", menu: "altas", migas: ["Dinkbit", "Altas"] });
  });

  test("clientes: la lista y la carpeta de cada uno", () => {
    expect(ubicacion("/panel/clientes", marcas)).toEqual({ espacio: "clientes", menu: "clientes", migas: ["Clientes", "Todos"] });
    expect(ubicacion("/panel/hydrup/ficha", marcas)).toEqual({ espacio: "clientes", menu: "cliente:hydrup", migas: ["Clientes", "Hydrup", "Ficha"] });
    expect(ubicacion("/panel/hydrup", marcas).migas).toEqual(["Clientes", "Hydrup", "Leads", "Resumen"]);
    expect(ubicacion("/panel/hydrup/whatsapp", marcas).migas).toEqual(["Clientes", "Hydrup", "WhatsApp", "Conexión"]);
    expect(ubicacion("/panel/hydrup/condiciones", marcas).migas).toEqual(["Clientes", "Hydrup", "Integraciones"]);
  });

  test("ajustes: usuarios y las condiciones de dinkbit", () => {
    expect(ubicacion("/panel/usuarias", marcas)).toEqual({ espacio: "ajustes", menu: "usuarias", migas: ["Ajustes", "Usuarios"] });
    expect(ubicacion("/panel/dinkbit/condiciones", marcas)).toEqual({ espacio: "ajustes", menu: "dinkbit:ajustes", migas: ["Ajustes", "Dinkbit"] });
  });

  test("una marca que no está en la lista se nombra por su slug", () => {
    expect(ubicacion("/panel/otra/tareas", marcas).migas).toEqual(["Clientes", "otra", "Tareas"]);
  });
});

describe("clientesDelMenu y alternarAnclado", () => {
  const clientes = [{ id: "a" }, { id: "b" }, { id: "c" }];
  test("solo los anclados, en el orden de la lista", () => {
    expect(clientesDelMenu(clientes, ["c", "a", "zzz"])).toEqual({ lista: [{ id: "a" }, { id: "c" }], conAnclaje: true });
    expect(clientesDelMenu(clientes, [])).toEqual({ lista: [], conAnclaje: true });
  });
  test("sin la migración, todos", () => {
    expect(clientesDelMenu(clientes, undefined)).toEqual({ lista: clientes, conAnclaje: false });
  });
  test("anclar y soltar", () => {
    expect(alternarAnclado(["a"], "b")).toEqual(["a", "b"]);
    expect(alternarAnclado(["a", "b"], "a")).toEqual(["b"]);
  });
});

describe("colorDeCliente", () => {
  test("estable por slug y nunca el azul de dinkbit", () => {
    expect(colorDeCliente("hydrup")).toBe(colorDeCliente("hydrup"));
    for (const s of ["a", "hydrup", "nubosoft", "zz", "cliente-largo-de-prueba"]) expect(colorDeCliente(s)).not.toBe("#1557b8");
  });
});
