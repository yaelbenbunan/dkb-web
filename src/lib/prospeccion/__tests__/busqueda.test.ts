import { beforeEach, describe, expect, test, vi } from "vitest";
import { buscarNegocios, MAX_POR_BUSQUEDA } from "../busqueda";
import type { FilaLugar } from "../overture";
import type { ProspectoNuevo } from "../tipos";

function lugar(n: number, extra: Partial<FilaLugar> = {}): FilaLugar {
  return {
    id: `ov-${n}`,
    nombre: `Clínica ${n}`,
    categorias: ["dentistas"],
    categoria_overture: "dental_clinic",
    direccion: `Calle ${n}`,
    municipio: "Getafe",
    municipio_clave: "getafe",
    provincia: "Madrid",
    cp: "28901",
    lat: 40.3,
    lon: -3.7,
    telefono: `+349100${String(n).padStart(5, "0")}`,
    telefono_clave: `9100${String(n).padStart(5, "0")}`,
    web: `https://clinica${n}.es`,
    email: null,
    redes: [],
    fuentes: ["meta"],
    licencias: ["CDLA-Permissive-2.0"],
    confianza: 0.9,
    release: "2026-09-23.1",
    ...extra,
  };
}

const osm = (id: string, extra: Partial<ProspectoNuevo> = {}): ProspectoNuevo => ({
  source: "osm", external_id: id, name: id, sector: "Clínicas dentales", address: null, city: "Getafe",
  province: null, phone: null, website: null, rating: null, reviews: null, ...extra,
});

const deps = {
  buscarLugares: vi.fn(),
  huellasDeProspectos: vi.fn(),
  buscarEnOsm: vi.fn(),
};

beforeEach(() => {
  vi.resetAllMocks();
  deps.huellasDeProspectos.mockResolvedValue({ ids: new Set(), fichas: [] });
  deps.buscarEnOsm.mockResolvedValue({ ok: true, prospectos: [osm("node/1")] });
});

describe("buscarNegocios", () => {
  test("con lugares de Overture en el municipio, los usa y no llama a OSM", async () => {
    deps.buscarLugares.mockResolvedValue([lugar(1), lugar(2)]);
    const r = await buscarNegocios({ categoria: "dentistas", ciudad: "Getafe" }, deps);
    expect(deps.buscarLugares).toHaveBeenCalledWith({ clave: "dentistas", municipio: "getafe" });
    expect(deps.buscarEnOsm).not.toHaveBeenCalled();
    expect(r).toMatchObject({ ok: true, fuente: "overture", encontradas: 2, yaTenias: 0, repetidas: 0, quedan: 0 });
    if (!r.ok) throw new Error();
    expect(r.prospectos.map((p) => [p.source, p.external_id, p.sector])).toEqual([
      ["overture", "ov-1", "Clínicas dentales"],
      ["overture", "ov-2", "Clínicas dentales"],
    ]);
  });

  test("si el municipio no da nada, prueba el texto como provincia", async () => {
    deps.buscarLugares.mockResolvedValueOnce([]).mockResolvedValueOnce([lugar(1)]);
    const r = await buscarNegocios({ categoria: "dentistas", ciudad: "vizcaya" }, deps);
    expect(deps.buscarLugares).toHaveBeenLastCalledWith({ clave: "dentistas", provincia: "Bizkaia" });
    expect(r).toMatchObject({ ok: true, fuente: "overture" });
  });

  test("sin tabla (migración sin ejecutar) o sin resultados, busca en OSM como siempre", async () => {
    deps.buscarLugares.mockResolvedValue(null);
    const r = await buscarNegocios({ categoria: "dentistas", ciudad: "Getafe" }, deps);
    expect(deps.buscarEnOsm).toHaveBeenCalledWith({ categoria: "dentistas", ciudad: "Getafe" });
    expect(r).toMatchObject({ ok: true, fuente: "osm", encontradas: 1 });

    deps.buscarLugares.mockResolvedValue([]);
    expect(await buscarNegocios({ categoria: "dentistas", ciudad: "Getafe" }, deps)).toMatchObject({ fuente: "osm" });
  });

  test("los errores de OSM pasan tal cual", async () => {
    deps.buscarLugares.mockResolvedValue([]);
    deps.buscarEnOsm.mockResolvedValue({ ok: false, error: "ciudad_no_encontrada" });
    expect(await buscarNegocios({ categoria: "dentistas", ciudad: "Xyz" }, deps)).toEqual({ ok: false, error: "ciudad_no_encontrada" });
  });

  test("fuera los que ya son prospectos y los duplicados de OSM (mismo teléfono, o misma web en el municipio)", async () => {
    deps.buscarLugares.mockResolvedValue([lugar(1), lugar(2), lugar(3), lugar(4)]);
    deps.huellasDeProspectos.mockResolvedValue({
      ids: new Set(["overture:ov-1"]),
      fichas: [
        { city: "Getafe", phone: "+34 910 000 002", website: null },
        { city: "getafe", phone: null, website: "http://www.clinica3.es/" },
      ],
    });
    const r = await buscarNegocios({ categoria: "dentistas", ciudad: "Getafe" }, deps);
    if (!r.ok) throw new Error();
    expect(r.prospectos.map((p) => p.external_id)).toEqual(["ov-4"]);
    expect(r).toMatchObject({ encontradas: 4, yaTenias: 3, repetidas: 0 });
  });

  test("las sedes repetidas dentro de los datos (mismo teléfono) no cuentan como «ya las tenías»", async () => {
    // Sin ningún prospecto guardado: lo repetido viene de la propia fuente.
    deps.buscarLugares.mockResolvedValue([
      lugar(1),
      lugar(2, { telefono: "+34910000001", telefono_clave: "910000001" }),
      lugar(3, { telefono: "+34910000001", telefono_clave: "910000001" }),
    ]);
    const r = await buscarNegocios({ categoria: "dentistas", ciudad: "Getafe" }, deps);
    if (!r.ok) throw new Error();
    expect(r.prospectos.map((p) => p.external_id)).toEqual(["ov-1"]);
    expect(r).toMatchObject({ encontradas: 3, yaTenias: 0, repetidas: 2 });
  });

  test("el mismo filtro se aplica a lo que llega de OSM", async () => {
    deps.buscarLugares.mockResolvedValue(null);
    deps.huellasDeProspectos.mockResolvedValue({ ids: new Set(), fichas: [{ city: "Getafe", phone: "910000001", website: null }] });
    deps.buscarEnOsm.mockResolvedValue({ ok: true, prospectos: [osm("node/1", { phone: "+34 910 00 00 01" }), osm("node/2")] });
    const r = await buscarNegocios({ categoria: "dentistas", ciudad: "Getafe" }, deps);
    if (!r.ok) throw new Error();
    expect(r.prospectos.map((p) => p.external_id)).toEqual(["node/2"]);
  });

  test("si no se pueden leer los prospectos, sigue sin quitar duplicados", async () => {
    deps.buscarLugares.mockResolvedValue([lugar(1)]);
    deps.huellasDeProspectos.mockResolvedValue(null);
    expect(await buscarNegocios({ categoria: "dentistas", ciudad: "Getafe" }, deps)).toMatchObject({ ok: true, encontradas: 1, yaTenias: 0, repetidas: 0 });
  });

  test("guarda como mucho MAX_POR_BUSQUEDA, primero los que tienen teléfono, y dice cuántos quedan", async () => {
    const muchos = Array.from({ length: MAX_POR_BUSQUEDA + 5 }, (_, i) => lugar(i + 1));
    muchos[0] = lugar(1, { telefono: null, telefono_clave: null });
    deps.buscarLugares.mockResolvedValue(muchos);
    const r = await buscarNegocios({ categoria: "dentistas", ciudad: "Getafe" }, deps);
    if (!r.ok) throw new Error();
    expect(r.prospectos).toHaveLength(MAX_POR_BUSQUEDA);
    expect(r.prospectos[0].external_id).toBe("ov-2");
    expect(r.prospectos.some((p) => p.external_id === "ov-1")).toBe(false);
    expect(r.quedan).toBe(5);
  });

  test("categoría desconocida", async () => {
    expect(await buscarNegocios({ categoria: "nada", ciudad: "Getafe" }, deps)).toEqual({ ok: false, error: "categoria_desconocida" });
    expect(deps.buscarLugares).not.toHaveBeenCalled();
  });
});
