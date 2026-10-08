import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { buscarEnPlaces, normalizarLugar } from "../places";

const lugar = {
  id: "ChIJ123",
  displayName: { text: "Bar Pepe" },
  formattedAddress: "Calle Mayor 1, 28013 Madrid, España",
  addressComponents: [
    { longText: "Madrid", types: ["locality", "political"] },
    { longText: "Madrid", types: ["administrative_area_level_2", "political"] },
  ],
  nationalPhoneNumber: "910 00 00 00",
  websiteUri: "https://www.barpepe.es/",
  primaryTypeDisplayName: { text: "Restaurante" },
  rating: 4.4,
  userRatingCount: 312,
};

describe("normalizarLugar", () => {
  test("mapea los campos de Places", () => {
    expect(normalizarLugar(lugar, "madrid")).toEqual({
      source: "places",
      external_id: "ChIJ123",
      name: "Bar Pepe",
      sector: "Restaurante",
      address: "Calle Mayor 1, 28013 Madrid, España",
      city: "Madrid",
      province: "Madrid",
      phone: "910 00 00 00",
      website: "https://www.barpepe.es/",
      rating: 4.4,
      reviews: 312,
    });
  });

  test("sin id o sin nombre no sirve", () => {
    expect(normalizarLugar({ ...lugar, id: undefined }, "Madrid")).toBeNull();
    expect(normalizarLugar({ ...lugar, displayName: { text: " " } }, "Madrid")).toBeNull();
    expect(normalizarLugar(null, "Madrid")).toBeNull();
  });

  test("si Places no da la localidad, usa la ciudad buscada", () => {
    expect(normalizarLugar({ ...lugar, addressComponents: undefined }, "Getafe")?.city).toBe("Getafe");
  });

  test("un perfil de red social no cuenta como web", () => {
    for (const web of [
      "https://www.facebook.com/barpepe",
      "https://instagram.com/barpepe",
      "https://m.facebook.com/barpepe",
      "https://linktr.ee/barpepe",
      "https://wa.me/34600000000",
    ]) {
      expect(normalizarLugar({ ...lugar, websiteUri: web }, "Madrid")?.website).toBeNull();
    }
  });
});

describe("buscarEnPlaces", () => {
  beforeEach(() => vi.stubEnv("GOOGLE_PLACES_API_KEY", "clave"));
  afterEach(() => vi.unstubAllEnvs());

  const respuesta = (cuerpo: unknown, ok = true, status = 200) =>
    ({ ok, status, json: async () => cuerpo, text: async () => JSON.stringify(cuerpo) }) as Response;

  test("sin clave no llama a la API", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "");
    const f = vi.fn();
    expect(await buscarEnPlaces({ categoria: "restaurante", ciudad: "Madrid" }, f)).toEqual({
      ok: false,
      error: "sin_clave",
    });
    expect(f).not.toHaveBeenCalled();
  });

  test("pide en español, para España, y sigue la paginación", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(respuesta({ places: [lugar], nextPageToken: "t2" }))
      .mockResolvedValueOnce(respuesta({ places: [{ ...lugar, id: "ChIJ456" }] }));
    const r = await buscarEnPlaces({ categoria: "restaurante", ciudad: "Madrid" }, f);
    expect(r.ok && r.prospectos.map((p) => p.external_id)).toEqual(["ChIJ123", "ChIJ456"]);

    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://places.googleapis.com/v1/places:searchText");
    expect(init.headers["X-Goog-Api-Key"]).toBe("clave");
    expect(init.headers["X-Goog-FieldMask"]).toContain("places.websiteUri");
    expect(JSON.parse(init.body)).toEqual({
      textQuery: "restaurante en Madrid",
      languageCode: "es",
      regionCode: "ES",
      pageSize: 20,
    });
    expect(JSON.parse(f.mock.calls[1][1].body).pageToken).toBe("t2");
  });

  test("no pasa de tres páginas", async () => {
    const f = vi.fn().mockResolvedValue(respuesta({ places: [lugar], nextPageToken: "mas" }));
    await buscarEnPlaces({ categoria: "restaurante", ciudad: "Madrid" }, f);
    expect(f).toHaveBeenCalledTimes(3);
  });

  test("si una página falla, no devuelve resultados a medias", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(respuesta({ places: [lugar], nextPageToken: "t2" }))
      .mockResolvedValueOnce(respuesta({ error: { message: "quota" } }, false, 429));
    const r = await buscarEnPlaces({ categoria: "restaurante", ciudad: "Madrid" }, f);
    expect(r).toEqual({ ok: false, error: "error_api", detalle: expect.stringContaining("429") });
  });

  test("un fallo de red también es error_api", async () => {
    const f = vi.fn().mockRejectedValue(new Error("ECONNRESET"));
    const r = await buscarEnPlaces({ categoria: "restaurante", ciudad: "Madrid" }, f);
    expect(r).toEqual({ ok: false, error: "error_api", detalle: "ECONNRESET" });
  });

  test("cero resultados es una búsqueda válida", async () => {
    const f = vi.fn().mockResolvedValue(respuesta({}));
    expect(await buscarEnPlaces({ categoria: "x", ciudad: "y" }, f)).toEqual({ ok: true, prospectos: [] });
  });
});
