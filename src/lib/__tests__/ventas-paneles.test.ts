import { beforeEach, describe, expect, test, vi } from "vitest";

const m = vi.hoisted(() => ({ listLeads: vi.fn(), listActividadMarca: vi.fn(), listCambiosFaseMarca: vi.fn() }));
vi.mock("../ventas/db", () => m);

import { cargarPanelMarca, mesDeConsulta } from "../ventas/paneles";

describe("cargarPanelMarca", () => {
  beforeEach(() => {
    m.listLeads.mockReset().mockResolvedValue([
      { id: "a", fase: "interesado", created_at: "2026-09-03T10:00:00Z", proximo_seguimiento: "2026-09-01" },
    ]);
    m.listActividadMarca.mockReset().mockResolvedValue([{ tipo: "llamada", datos: {}, created_at: "2026-09-03T11:00:00Z" }]);
    m.listCambiosFaseMarca.mockReset().mockResolvedValue([{ lead_id: "a", datos: { fase_nueva: "interesado" } }]);
  });

  test("pide la actividad del rango del mes y combina embudo y resumen", async () => {
    const datos = await cargarPanelMarca({ id: "m1" } as never, "2026-09", "2026-09-17");
    expect(m.listActividadMarca).toHaveBeenCalledWith("m1", "2026-08-31T00:00:00.000Z", "2026-10-02T00:00:00.000Z");
    expect(datos.embudo.alcanzaron.interesado).toBe(1);
    expect(datos.resumen).toEqual({ leadsNuevos: 1, llamadas: 1, interesados: 0, muestras: 0, seguimientosAtrasados: 1 });
  });
});

describe("mesDeConsulta", () => {
  test("usa el mes de la URL si es válido; si no, el actual en Madrid", () => {
    expect(mesDeConsulta("2026-08")).toBe("2026-08");
    expect(mesDeConsulta("basura", new Date("2026-09-30T23:30:00Z"))).toBe("2026-10");
  });
});
