import { beforeEach, describe, expect, test, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireUsuaria: vi.fn(),
  accesoMarcaAccion: vi.fn(),
  getMarcaPorId: vi.fn(),
  listMarcas: vi.fn(),
  crearMarca: vi.fn(),
  setClientesAnclados: vi.fn(),
  setServiciosMarca: vi.fn(),
  listTareasProyecto: vi.fn(),
  crearTareasProyecto: vi.fn(),
  getAltaPorId: vi.fn(),
  vincularAltaMarca: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("@/lib/ventas/auth", () => ({ requireUsuaria: m.requireUsuaria, accesoMarcaAccion: m.accesoMarcaAccion }));
vi.mock("@/lib/ventas/db", () => ({
  getMarcaPorId: m.getMarcaPorId,
  listMarcas: m.listMarcas,
  crearMarca: m.crearMarca,
  setClientesAnclados: m.setClientesAnclados,
  setServiciosMarca: m.setServiciosMarca,
  listTareasProyecto: m.listTareasProyecto,
  crearTareasProyecto: m.crearTareasProyecto,
  // Lo que importan las acciones y aquí no se usa.
  actualizarCondiciones: vi.fn(),
  borrarExclusion: vi.fn(),
  crearExclusion: vi.fn(),
  regenerarSecretoWebhook: vi.fn(),
  actualizarTarea: vi.fn(),
  crearTarea: vi.fn(),
  getLead: vi.fn(),
  getTarea: vi.fn(),
  getUsuaria: vi.fn(),
}));
vi.mock("@/lib/altas/db", () => ({
  getAltaPorId: m.getAltaPorId,
  vincularAltaMarca: m.vincularAltaMarca,
  crearAlta: vi.fn(),
  setAltaActiva: vi.fn(),
}));

import { crearFichaDesdeAltaAction, vincularAltaAction } from "@/app/(site)/panel/acciones-altas";
import { alternarAncladoAction, guardarServiciosAction } from "@/app/(site)/panel/acciones-marcas";
import { crearTareasPlantillaAction } from "@/app/(site)/panel/acciones-tareas";

const ADMIN = { id: "u1", rol: "admin", activa: true, marca_id: null, clientes_anclados: ["otra"] };
const MARCA = { id: "m1", slug: "nubosoft", nombre: "Nubosoft" };

async function destino(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    return String((e as Error).message).replace("REDIRECT:", "");
  }
  throw new Error("no redirigió");
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  m.requireUsuaria.mockResolvedValue(ADMIN);
  m.getMarcaPorId.mockResolvedValue(MARCA);
  m.setClientesAnclados.mockResolvedValue({ ok: true });
  m.setServiciosMarca.mockResolvedValue({ ok: true });
  m.vincularAltaMarca.mockResolvedValue({ ok: true });
});

describe("anclar clientes", () => {
  test("ancla y suelta en la lista de quien lo pide; solo el equipo", async () => {
    expect(await alternarAncladoAction("m1")).toEqual({ ok: true });
    expect(m.requireUsuaria).toHaveBeenCalledWith("equipo");
    expect(m.setClientesAnclados).toHaveBeenCalledWith("u1", ["otra", "m1"]);
  });

  test("sin la migración lo dice, sin tocar nada", async () => {
    m.requireUsuaria.mockResolvedValue({ ...ADMIN, clientes_anclados: undefined });
    const r = await alternarAncladoAction("m1");
    expect(r).toMatchObject({ ok: false, error: expect.stringContaining("2026-11-18-panel-fichas-clientes.sql") });
    expect(m.setClientesAnclados).not.toHaveBeenCalled();
  });

  test("un cliente que no existe", async () => {
    m.getMarcaPorId.mockResolvedValue(null);
    expect(await alternarAncladoAction("x")).toMatchObject({ ok: false });
  });
});

describe("servicios de la ficha", () => {
  test("guarda solo claves reales, en orden", async () => {
    expect(await guardarServiciosAction("m1", ["rrss", "inventado", "web"])).toMatchObject({ ok: true });
    expect(m.setServiciosMarca).toHaveBeenCalledWith("m1", ["web", "rrss"]);
  });
  test("rechaza lo que no es una lista", async () => {
    expect(await guardarServiciosAction("m1", "web")).toMatchObject({ ok: false });
    expect(m.setServiciosMarca).not.toHaveBeenCalled();
  });
});

describe("crear ficha de cliente desde un alta", () => {
  const ALTA = { id: "a1", cliente: "Nubosoft S.L.", enviada_en: "2026-10-28T10:00:00Z", marca_id: null };

  test("crea el cliente con un identificador libre, los une, lo ancla y abre la ficha", async () => {
    m.getAltaPorId.mockResolvedValue(ALTA);
    m.listMarcas.mockResolvedValue([{ slug: "nubosoft-s-l" }, { slug: "dinkbit" }]);
    m.crearMarca.mockResolvedValue({ ok: true, marca: { id: "m9", slug: "nubosoft-s-l-2" } });
    expect(await destino(crearFichaDesdeAltaAction("a1"))).toBe("/panel/nubosoft-s-l-2/ficha");
    expect(m.requireUsuaria).toHaveBeenCalledWith("admin");
    expect(m.crearMarca).toHaveBeenCalledWith({ nombre: "Nubosoft S.L.", slug: "nubosoft-s-l-2" });
    expect(m.vincularAltaMarca).toHaveBeenCalledWith("a1", "m9");
    expect(m.setClientesAnclados).toHaveBeenCalledWith("u1", ["otra", "m9"]);
  });

  test("ni sin enviar, ni dos veces, ni sin la migración", async () => {
    m.getAltaPorId.mockResolvedValue({ ...ALTA, enviada_en: null });
    expect(await crearFichaDesdeAltaAction("a1")).toMatchObject({ ok: false });
    m.getAltaPorId.mockResolvedValue({ ...ALTA, marca_id: "m1" });
    expect(await crearFichaDesdeAltaAction("a1")).toMatchObject({ ok: false, error: "Esta alta ya tiene ficha de cliente." });
    m.getAltaPorId.mockResolvedValue({ id: ALTA.id, cliente: ALTA.cliente, enviada_en: ALTA.enviada_en });
    expect(await crearFichaDesdeAltaAction("a1")).toMatchObject({ ok: false, error: expect.stringContaining("panel-fichas-clientes") });
    expect(m.crearMarca).not.toHaveBeenCalled();
  });

  test("unir un alta enviada a un cliente que ya existía", async () => {
    m.getAltaPorId.mockResolvedValue(ALTA);
    expect(await vincularAltaAction("m1", "a1")).toMatchObject({ ok: true });
    expect(m.vincularAltaMarca).toHaveBeenCalledWith("a1", "m1");
  });
});

describe("tareas desde la plantilla de un servicio", () => {
  beforeEach(() => {
    m.accesoMarcaAccion.mockResolvedValue({ ok: true, usuaria: ADMIN, marca: MARCA });
    m.listTareasProyecto.mockResolvedValue({ estado: "ok", tareas: [{ id: "t", proyecto: "web", titulo: "Reunión de arranque", hecha_at: null }] });
    m.crearTareasProyecto.mockResolvedValue({ ok: true });
  });

  test("crea solo las marcadas que aún no tiene, con su fase y orden", async () => {
    const r = await crearTareasPlantillaAction("nubosoft", "web", ["web:0", "web:1", "web:2"]);
    expect(r).toMatchObject({ ok: true, mensaje: "2 tareas añadidas a Web." });
    expect(m.crearTareasProyecto).toHaveBeenCalledWith("m1", "u1", [
      expect.objectContaining({ proyecto: "web", fase: "Arranque", titulo: "Revisar el alta y los archivos del cliente", orden: 0 }),
      expect.objectContaining({ proyecto: "web", fase: "Arranque", titulo: "Mapa de páginas aprobado", orden: 2 }),
    ]);
  });

  test("la clienta no monta proyectos", async () => {
    m.accesoMarcaAccion.mockResolvedValue({ ok: true, usuaria: { ...ADMIN, rol: "cliente" }, marca: MARCA });
    expect(await crearTareasPlantillaAction("nubosoft", "web", ["web:0"])).toMatchObject({ ok: false });
    expect(m.crearTareasProyecto).not.toHaveBeenCalled();
  });

  test("servicio inventado o nada marcado", async () => {
    expect(await crearTareasPlantillaAction("nubosoft", "otro", ["otro:0"])).toMatchObject({ ok: false, error: "Servicio no válido." });
    expect(await crearTareasPlantillaAction("nubosoft", "web", [])).toMatchObject({ ok: false, error: "Marca al menos una tarea." });
  });
});
