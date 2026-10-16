import { beforeEach, describe, expect, test, vi } from "vitest";

const m = vi.hoisted(() => ({
  listExclusiones: vi.fn(),
  buscarLeadPorContacto: vi.fn(),
  crearLeads: vi.fn(),
  actualizarLeadWeb: vi.fn(),
  registrarActividad: vi.fn(),
}));
vi.mock("../ventas/db", () => m);

import { pasarProspectoAlEmbudo } from "../ventas/prospeccion";

const MARCA = { id: "m1", slug: "dinkbit", nombre: "dinkbit" } as never;
const USUARIA = { id: "u1", nombre: "Paula", rol: "comercial", activa: true } as never;
const PROSPECTO = {
  id: "p1",
  name: "Bar Pepe",
  email: "info@barpepe.es",
  phone: "916 000 000",
  website: "https://barpepe.es",
  city: "Getafe",
  sector: "Restaurante",
  sent_at: "2026-10-12T09:30:00.000Z",
};
const LEAD = { id: "lead1", marca_id: "m1", negocio: "Bar Pepe", extra: { otra: "cosa" } };

beforeEach(() => {
  Object.values(m).forEach((f) => f.mockReset());
  m.listExclusiones.mockResolvedValue([]);
  m.buscarLeadPorContacto.mockResolvedValueOnce(null).mockResolvedValue(LEAD);
  m.crearLeads.mockResolvedValue({ ok: true, creados: 1 });
  m.actualizarLeadWeb.mockResolvedValue({ ok: true });
  m.registrarActividad.mockResolvedValue({ ok: true });
});

describe("pasarProspectoAlEmbudo", () => {
  test("crea el lead en la marca con los datos del prospecto, origen manual «Prospección»", async () => {
    const r = await pasarProspectoAlEmbudo({ marca: MARCA, usuaria: USUARIA, prospecto: PROSPECTO });
    expect(r).toEqual({ ok: true, leadId: "lead1", existia: false });
    expect(m.crearLeads).toHaveBeenCalledWith({
      marcaId: "m1",
      usuariaId: "u1",
      origen: "manual",
      origenDetalle: "Prospección",
      leads: [
        {
          negocio: "Bar Pepe",
          tipo_negocio: null,
          contacto: "",
          telefono: "916 000 000",
          email: "info@barpepe.es",
          ciudad: "Getafe",
          cif: "",
          web: "https://barpepe.es",
          excluido: false,
        },
      ],
    });
  });

  test("después apunta canal y extra (sin pisar lo que ya había en extra), sin consentimiento", async () => {
    await pasarProspectoAlEmbudo({ marca: MARCA, usuaria: USUARIA, prospecto: PROSPECTO });
    expect(m.actualizarLeadWeb).toHaveBeenCalledWith("lead1", {
      canal: "Prospección",
      extra: { otra: "cosa", sector: "Restaurante", prospecto_id: "p1" },
    });
    const cambios = m.actualizarLeadWeb.mock.calls[0][1];
    expect(cambios).not.toHaveProperty("consentimiento");
  });

  test("deja una nota en el historial con sector, ciudad y fecha del correo", async () => {
    await pasarProspectoAlEmbudo({ marca: MARCA, usuaria: USUARIA, prospecto: PROSPECTO });
    expect(m.registrarActividad).toHaveBeenCalledWith({
      leadId: "lead1",
      usuariaId: "u1",
      tipo: "nota",
      nota: "Viene de Prospección (Restaurante · Getafe). Se le escribió el 12/10/2026 y respondió.",
    });
  });

  test("si ya hay un lead con ese email o teléfono, enlaza con él y no crea otro", async () => {
    m.buscarLeadPorContacto.mockReset().mockResolvedValue({ id: "viejo", marca_id: "m1", extra: {} });
    const r = await pasarProspectoAlEmbudo({ marca: MARCA, usuaria: USUARIA, prospecto: PROSPECTO });
    expect(r).toEqual({ ok: true, leadId: "viejo", existia: true });
    expect(m.buscarLeadPorContacto).toHaveBeenCalledWith("m1", { email: "info@barpepe.es", telefono: "916 000 000" });
    expect(m.crearLeads).not.toHaveBeenCalled();
    expect(m.actualizarLeadWeb).not.toHaveBeenCalled();
    expect(m.registrarActividad).toHaveBeenCalledWith(expect.objectContaining({ leadId: "viejo", tipo: "nota" }));
  });

  test("un contacto de la lista de exclusión (ya es cliente) no entra", async () => {
    m.listExclusiones.mockResolvedValue([{ email: "info@barpepe.es", telefono: null, cif: null }]);
    const r = await pasarProspectoAlEmbudo({ marca: MARCA, usuaria: USUARIA, prospecto: PROSPECTO });
    expect(r).toEqual({ ok: false, error: "Esta empresa está en la lista de exclusión de la marca: ya es cliente." });
    expect(m.crearLeads).not.toHaveBeenCalled();
  });

  test("si el canal no se puede guardar (falta la migración), el alta sigue valiendo", async () => {
    m.actualizarLeadWeb.mockResolvedValue({ ok: false, error: "No se pudo guardar." });
    m.registrarActividad.mockRejectedValue(new Error("caída"));
    expect(await pasarProspectoAlEmbudo({ marca: MARCA, usuaria: USUARIA, prospecto: PROSPECTO })).toEqual({
      ok: true,
      leadId: "lead1",
      existia: false,
    });
  });

  test("si el alta falla, lo dice y no escribe nada más", async () => {
    m.crearLeads.mockResolvedValue({ ok: false, error: "x" });
    expect(await pasarProspectoAlEmbudo({ marca: MARCA, usuaria: USUARIA, prospecto: PROSPECTO })).toEqual({
      ok: false,
      error: "No se pudo crear el lead.",
    });
    expect(m.actualizarLeadWeb).not.toHaveBeenCalled();
    expect(m.registrarActividad).not.toHaveBeenCalled();
  });

  test("si otro lo creó a la vez (cero creados), enlaza con el que hay", async () => {
    m.crearLeads.mockResolvedValue({ ok: true, creados: 0 });
    expect(await pasarProspectoAlEmbudo({ marca: MARCA, usuaria: USUARIA, prospecto: PROSPECTO })).toEqual({
      ok: true,
      leadId: "lead1",
      existia: true,
    });
  });

  test("un fallo leyendo la base no se escapa como excepción", async () => {
    m.buscarLeadPorContacto.mockReset().mockRejectedValue(new Error("red"));
    expect(await pasarProspectoAlEmbudo({ marca: MARCA, usuaria: USUARIA, prospecto: PROSPECTO })).toEqual({
      ok: false,
      error: "No se pudo crear el lead.",
    });
  });

  test("sin sector, ciudad ni fecha, la nota sigue siendo legible", async () => {
    await pasarProspectoAlEmbudo({
      marca: MARCA,
      usuaria: USUARIA,
      prospecto: { ...PROSPECTO, sector: null, city: null, sent_at: null, phone: null },
    });
    expect(m.registrarActividad).toHaveBeenCalledWith(expect.objectContaining({ nota: "Viene de Prospección. Respondió al correo." }));
    expect(m.crearLeads.mock.calls[0][0].leads[0]).toMatchObject({ telefono: "", ciudad: "" });
  });
});
