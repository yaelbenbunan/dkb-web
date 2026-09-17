import { beforeEach, describe, expect, test, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireUsuaria: vi.fn(),
  getMarcaPorSlug: vi.fn(),
  getLead: vi.fn(),
  getUsuaria: vi.fn(),
  actualizarDatosLead: vi.fn(),
  asignarLead: vi.fn(),
  importarLeadsCsv: vi.fn(),
  previsualizarImportacion: vi.fn(),
  crearLeadManual: vi.fn(),
  registrarLlamada: vi.fn(),
  marcarMuestrasEnviadas: vi.fn(),
  anadirNota: vi.fn(),
  cambiarFaseManual: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));
vi.mock("@/lib/ventas/auth", () => ({ requireUsuaria: m.requireUsuaria }));
vi.mock("@/lib/ventas/db", () => ({
  getMarcaPorSlug: m.getMarcaPorSlug,
  getLead: m.getLead,
  getUsuaria: m.getUsuaria,
  actualizarDatosLead: m.actualizarDatosLead,
  asignarLead: m.asignarLead,
}));
vi.mock("@/lib/ventas/servicios", () => ({
  importarLeadsCsv: m.importarLeadsCsv,
  previsualizarImportacion: m.previsualizarImportacion,
  crearLeadManual: m.crearLeadManual,
  registrarLlamada: m.registrarLlamada,
  marcarMuestrasEnviadas: m.marcarMuestrasEnviadas,
  anadirNota: m.anadirNota,
  cambiarFaseManual: m.cambiarFaseManual,
}));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: m.redirect }));

import {
  importarLeadsAction,
  previsualizarLeadsAction,
  crearLeadManualAction,
  actualizarLeadAction,
  asignarLeadAction,
  registrarLlamadaAction,
  muestrasEnviadasAction,
  notaAction,
  cambiarFaseAction,
} from "@/app/(site)/panel/ventas/acciones-leads";

const USUARIA = { id: "u1", rol: "comercial", activa: true };
const MARCA = { id: "m1", slug: "hydrup" };
const LEAD = { id: "l1", marca_id: "m1", fase: "nuevo" };

function fd(campos: Record<string, string>) {
  const f = new FormData();
  Object.entries(campos).forEach(([k, v]) => f.set(k, v));
  return f;
}

beforeEach(() => {
  Object.values(m).forEach((f) => f.mockClear());
  m.requireUsuaria.mockReset().mockResolvedValue(USUARIA);
  m.getMarcaPorSlug.mockReset().mockResolvedValue(MARCA);
  m.getLead.mockReset().mockResolvedValue(LEAD);
  m.getUsuaria.mockReset().mockResolvedValue({ id: "u2", activa: true });
  for (const f of [m.actualizarDatosLead, m.asignarLead, m.registrarLlamada, m.marcarMuestrasEnviadas, m.anadirNota, m.cambiarFaseManual]) {
    f.mockReset().mockResolvedValue({ ok: true });
  }
  m.importarLeadsCsv.mockReset().mockResolvedValue({ ok: true, creados: 1, duplicados: 0, excluidos: 0 });
  m.crearLeadManual.mockReset().mockResolvedValue({ ok: true, leadId: "l9" });
});

describe("acciones de leads", () => {
  test("sin sesión no se ejecuta ninguna", async () => {
    m.requireUsuaria.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(importarLeadsAction("hydrup", null, fd({ csv: "x" }))).rejects.toThrow();
    await expect(registrarLlamadaAction("hydrup", "l1", null, fd({ resultado: "no_contesta" }))).rejects.toThrow();
    await expect(asignarLeadAction("hydrup", "l1", "u2")).rejects.toThrow();
    expect(m.importarLeadsCsv).not.toHaveBeenCalled();
    expect(m.registrarLlamada).not.toHaveBeenCalled();
    expect(m.asignarLead).not.toHaveBeenCalled();
  });

  test("importar pasa el CSV, el fichero y la lista al servicio", async () => {
    await importarLeadsAction("hydrup", null, fd({ csv: "negocio\nGym", nombre_fichero: "g.csv", nombre_lista: "Gyms" }));
    expect(m.importarLeadsCsv).toHaveBeenCalledWith({ marca: MARCA, usuaria: USUARIA, csv: "negocio\nGym", nombreFichero: "g.csv", nombreLista: "Gyms" });
  });

  test("un lead de otra marca no se toca", async () => {
    m.getLead.mockResolvedValue({ ...LEAD, marca_id: "otra" });
    expect(await registrarLlamadaAction("hydrup", "l1", null, fd({ resultado: "no_contesta" }))).toEqual({ ok: false, error: "Lead no encontrado." });
    expect(m.registrarLlamada).not.toHaveBeenCalled();
  });

  test("llamada inválida no llega al servicio; válida sí", async () => {
    expect((await registrarLlamadaAction("hydrup", "l1", null, fd({ resultado: "" }))).ok).toBe(false);
    expect(m.registrarLlamada).not.toHaveBeenCalled();
    await registrarLlamadaAction("hydrup", "l1", null, fd({ resultado: "interesado", nota: "Quiere precios", proximo_seguimiento: "2026-09-22" }));
    expect(m.registrarLlamada).toHaveBeenCalledWith({
      usuaria: USUARIA,
      leadId: "l1",
      llamada: { resultado: "interesado", nota: "Quiere precios", proximo_seguimiento: "2026-09-22" },
    });
  });

  test("alta manual lleva a la ficha del lead", async () => {
    await expect(crearLeadManualAction("hydrup", null, fd({ negocio: "Gym", telefono: "600111222" }))).rejects.toThrow(
      "NEXT_REDIRECT:/panel/ventas/hydrup/leads/l9",
    );
  });

  test("asignar a una usuaria desactivada no se permite; vacío desasigna", async () => {
    m.getUsuaria.mockResolvedValue({ id: "u2", activa: false });
    expect((await asignarLeadAction("hydrup", "l1", "u2")).ok).toBe(false);
    await asignarLeadAction("hydrup", "l1", "");
    expect(m.asignarLead).toHaveBeenCalledWith("l1", null);
  });

  test("editar datos, muestras, nota y fase validan y delegan", async () => {
    await actualizarLeadAction("hydrup", "l1", null, fd({ negocio: "Gym", email: "a@b.es" }));
    expect(m.actualizarDatosLead).toHaveBeenCalledWith("l1", expect.objectContaining({ negocio: "Gym", email: "a@b.es" }));
    await muestrasEnviadasAction("hydrup", "l1", null, fd({ nota: "Pack 6", proximo_seguimiento: "" }));
    expect(m.marcarMuestrasEnviadas).toHaveBeenCalledWith({ usuaria: USUARIA, leadId: "l1", datos: { nota: "Pack 6", proximo_seguimiento: null } });
    await notaAction("hydrup", "l1", null, fd({ nota: "Hola", proximo_seguimiento: "" }));
    expect(m.anadirNota).toHaveBeenCalled();
    expect((await cambiarFaseAction("hydrup", "l1", null, fd({ fase: "inventada" }))).ok).toBe(false);
    await cambiarFaseAction("hydrup", "l1", null, fd({ fase: "perdido", nota: "" }));
    expect(m.cambiarFaseManual).toHaveBeenCalledWith({ usuaria: USUARIA, leadId: "l1", cambio: { fase: "perdido", nota: "" } });
  });

  test("previsualizar exige sesión y delega en el servicio con la marca", async () => {
    const previa = { validas: 1, errores: [], avisos: [], duplicados: [], excluidos: [], cabecerasDesconocidas: [] };
    m.previsualizarImportacion.mockReset().mockResolvedValue(previa);
    expect(await previsualizarLeadsAction("hydrup", "negocio\nGym")).toEqual({ ok: true, previa });
    expect(m.previsualizarImportacion).toHaveBeenCalledWith({ marca: MARCA, csv: "negocio\nGym" });

    m.getMarcaPorSlug.mockResolvedValue(null);
    expect(await previsualizarLeadsAction("nope", "x")).toEqual({ ok: false, error: "Marca no encontrada." });

    m.previsualizarImportacion.mockClear();
    m.requireUsuaria.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(previsualizarLeadsAction("hydrup", "x")).rejects.toThrow();
    expect(m.previsualizarImportacion).not.toHaveBeenCalled();
  });
});
