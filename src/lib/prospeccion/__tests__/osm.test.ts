import { describe, expect, test, vi } from "vitest";
import { buscarEnOsm, normalizarElemento } from "../osm";

const elemento = {
  type: "node",
  id: 2925189157,
  tags: {
    name: "Terra Nostra",
    amenity: "restaurant",
    "addr:street": "Paseo María Lejárraga",
    "addr:housenumber": "5",
    "addr:postcode": "28905",
    "addr:city": "Getafe",
    phone: "+34 910 00 00 00",
    website: "http://www.terranostrapizzeria.es",
    email: "Info@TerraNostra.es",
  },
};

describe("normalizarElemento", () => {
  test("mapea las etiquetas de OpenStreetMap", () => {
    expect(normalizarElemento(elemento, "Restaurantes", "getafe")).toEqual({
      source: "osm",
      external_id: "node/2925189157",
      name: "Terra Nostra",
      sector: "Restaurantes",
      address: "Paseo María Lejárraga 5, 28905 Getafe",
      city: "Getafe",
      province: null,
      phone: "+34 910 00 00 00",
      website: "http://www.terranostrapizzeria.es",
      email: "Info@TerraNostra.es",
      rating: null,
      reviews: null,
    });
  });

  test("acepta las variantes contact:* y la ciudad buscada si falta la del negocio", () => {
    const p = normalizarElemento(
      { type: "way", id: 7, tags: { name: "Bar", "contact:phone": "600", "contact:website": "https://bar.es", "contact:email": "hola@bar.es" } },
      "Bares y cafeterías",
      "Getafe",
    );
    expect(p).toMatchObject({
      external_id: "way/7",
      phone: "600",
      website: "https://bar.es",
      email: "hola@bar.es",
      city: "Getafe",
      address: null,
    });
  });

  test("limpia los espacios dobles de las etiquetas", () => {
    const p = normalizarElemento(
      { type: "node", id: 1, tags: { name: " Bar  Pepe ", "addr:street": "Avenida  de la Paz", "addr:housenumber": "3" } },
      "x",
      "y",
    );
    expect(p).toMatchObject({ name: "Bar Pepe", address: "Avenida de la Paz 3" });
  });

  test("sin nombre o sin id no sirve", () => {
    expect(normalizarElemento({ type: "node", id: 1, tags: { amenity: "restaurant" } }, "x", "y")).toBeNull();
    expect(normalizarElemento({ type: "node", tags: { name: "Bar" } }, "x", "y")).toBeNull();
    expect(normalizarElemento(null, "x", "y")).toBeNull();
  });

  test("un perfil de red social no cuenta como web", () => {
    for (const web of ["https://www.facebook.com/bar", "https://instagram.com/bar", "https://linktr.ee/bar", "javascript:alert(1)"]) {
      expect(normalizarElemento({ type: "node", id: 1, tags: { name: "Bar", website: web } }, "x", "y")?.website).toBeNull();
    }
  });

  test("una web sin esquema se completa con https", () => {
    expect(normalizarElemento({ type: "node", id: 1, tags: { name: "Bar", website: "www.bar.es" } }, "x", "y")?.website).toBe(
      "https://www.bar.es",
    );
  });
});

describe("buscarEnOsm", () => {
  const json = (cuerpo: unknown, ok = true, status = 200) =>
    ({ ok, status, json: async () => cuerpo, text: async () => JSON.stringify(cuerpo) }) as Response;
  const ciudad = [{ osm_type: "relation", osm_id: 345003, display_name: "Getafe, Comunidad de Madrid, España" }];

  /** fetch de mentira: Nominatim devuelve `lugares`, Overpass `elementos`. */
  function red(lugares: unknown, elementos: unknown, overpassOk = true) {
    return vi.fn(async (url: string | URL) =>
      String(url).includes("nominatim")
        ? json(lugares)
        : overpassOk
          ? json({ elements: elementos })
          : json({}, false, 504),
    );
  }

  test("una categoría desconocida no sale a la red", async () => {
    const f = red(ciudad, []);
    expect(await buscarEnOsm({ categoria: "ovnis", ciudad: "Getafe" }, f as never)).toEqual({
      ok: false,
      error: "categoria_desconocida",
    });
    expect(f).not.toHaveBeenCalled();
  });

  test("si no encuentra el municipio, lo dice y no consulta negocios", async () => {
    const f = red([], []);
    expect(await buscarEnOsm({ categoria: "restaurantes", ciudad: "Xyz" }, f as never)).toEqual({
      ok: false,
      error: "ciudad_no_encontrada",
    });
    expect(f).toHaveBeenCalledTimes(1);
  });

  test("busca el municipio en España y pide los negocios de su área", async () => {
    const f = red(ciudad, [elemento]);
    const r = await buscarEnOsm({ categoria: "dentistas", ciudad: " Getafe " }, f as never);
    expect(r.ok && r.prospectos.map((p) => p.name)).toEqual(["Terra Nostra"]);

    const [urlCiudad, initCiudad] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(urlCiudad).toContain("nominatim.openstreetmap.org/search");
    expect(urlCiudad).toContain("city=Getafe");
    expect(urlCiudad).toContain("countrycodes=es");
    expect((initCiudad.headers as Record<string, string>)["User-Agent"]).toContain("dinkbit");

    const [urlNegocios, initNegocios] = f.mock.calls[1] as unknown as [string, RequestInit];
    expect(urlNegocios).toContain("overpass");
    const consulta = new URLSearchParams(String(initNegocios.body)).get("data") ?? "";
    expect(consulta).toContain("area(3600345003)");
    expect(consulta).toContain('nwr["amenity"="dentist"]["name"](area.a);');
    expect(consulta).toContain('nwr["healthcare"="dentist"]["name"](area.a);');
    expect(initNegocios.signal).toBeInstanceOf(AbortSignal);
  });

  test("ignora resultados que no son un municipio (un nodo suelto)", async () => {
    const f = red([{ osm_type: "node", osm_id: 9 }, ...ciudad], []);
    const r = await buscarEnOsm({ categoria: "restaurantes", ciudad: "Getafe" }, f as never);
    expect(r).toEqual({ ok: true, prospectos: [] });
  });

  test("quita repetidos, pone primero a quien se puede contactar y corta en 120", async () => {
    const mudos = Array.from({ length: 130 }, (_, i) => ({ type: "node", id: i + 1, tags: { name: `Mudo ${i}` } }));
    const conWeb = { type: "node", id: 999, tags: { name: "Con web", website: "https://conweb.es" } };
    const conTel = { type: "node", id: 998, tags: { name: "Con teléfono", phone: "600" } };
    const f = red(ciudad, [...mudos, conTel, conWeb, conWeb]);
    const r = await buscarEnOsm({ categoria: "restaurantes", ciudad: "Getafe" }, f as never);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.prospectos).toHaveLength(120);
    expect(r.prospectos.slice(0, 2).map((p) => p.name)).toEqual(["Con web", "Con teléfono"]);
    expect(r.prospectos.filter((p) => p.name === "Con web")).toHaveLength(1);
  });

  test("si OpenStreetMap falla, no devuelve resultados a medias", async () => {
    const f = red(ciudad, [], false);
    expect(await buscarEnOsm({ categoria: "restaurantes", ciudad: "Getafe" }, f as never)).toEqual({
      ok: false,
      error: "error_api",
      detalle: expect.stringContaining("504"),
    });
  });

  test("un fallo de red también es error_api", async () => {
    const f = vi.fn().mockRejectedValue(new Error("ECONNRESET"));
    expect(await buscarEnOsm({ categoria: "restaurantes", ciudad: "Getafe" }, f as never)).toEqual({
      ok: false,
      error: "error_api",
      detalle: "ECONNRESET",
    });
  });
});
