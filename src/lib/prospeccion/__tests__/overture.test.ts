import { describe, expect, test } from "vitest";
import { CATEGORIAS } from "../categorias";
import {
  categoriasDeLugar,
  consultaOverture,
  lugarAProspecto,
  nodosOverture,
  transformarLugar,
  type LugarBruto,
} from "../overture";

/** Tal como sale de la consulta de DuckDB (un lugar real de Madrid, release 2026-09-23.1). */
const BRUTO: LugarBruto = {
  id: "0a1b2c3d-0000-4000-8000-000000000001",
  nombre: "Clínica dental Mardental",
  primaria: "dental_clinic",
  jerarquia: ["health_care", "outpatient_care_facility", "dental_clinic"],
  alternativas: null,
  telefonos: ["+34911995572"],
  webs: ["http://www.mardental.org/"],
  emails: ["mardental@mardental.org"],
  redes: ["https://www.facebook.com/177407656022189"],
  direccion: "C. de Oliva de Plasencia, 1",
  municipio: "Madrid",
  cp: "28044",
  pais: "ES",
  lat: 40.3822,
  lon: -3.7512,
  confianza: 0.88274085521698,
  estado: null,
  fuentes: ["meta", "Overture"],
  licencias: ["CDLA-Permissive-2.0", "CDLA-Permissive-2.0"],
};

const opciones = { release: "2026-09-23.1", confianzaMinima: 0.5 };

describe("categoriasDeLugar", () => {
  test("entra por cualquier nodo de su jerarquía", () => {
    expect(categoriasDeLugar({ primaria: "orthodontics", jerarquia: ["health_care", "outpatient_care_facility", "dental_clinic", "orthodontics"], alternativas: null })).toEqual(["dentistas"]);
    expect(categoriasDeLugar({ primaria: "pub", jerarquia: ["food_and_drink", "alcoholic_beverage_venue", "bar", "pub"], alternativas: null })).toEqual(["bares"]);
  });

  test("y por sus alternativas: un bar que también es restaurante cae en las dos", () => {
    expect(
      categoriasDeLugar({ primaria: "bar", jerarquia: ["food_and_drink", "alcoholic_beverage_venue", "bar"], alternativas: ["spanish_restaurant", "restaurant"] }),
    ).toEqual(["restaurantes", "bares"]);
  });

  test("los nodos genéricos solo cuentan como primaria exacta", () => {
    expect(categoriasDeLugar({ primaria: "real_estate_service", jerarquia: ["services_and_business", "real_estate_service"], alternativas: null })).toEqual(["inmobiliarias"]);
    // Una promotora cuelga de real_estate_service, pero no es una inmobiliaria.
    expect(categoriasDeLugar({ primaria: "home_developer", jerarquia: ["services_and_business", "real_estate_service", "builder", "home_developer"], alternativas: null })).toEqual([]);
  });

  test("sin taxonomía no entra en ninguna", () => {
    expect(categoriasDeLugar({ primaria: null, jerarquia: null, alternativas: null })).toEqual([]);
  });

  test("todas las categorías de la lista tienen nodos de Overture", () => {
    for (const c of CATEGORIAS) expect(c.overture.nodos.length + (c.overture.exactas?.length ?? 0)).toBeGreaterThan(0);
  });
});

describe("transformarLugar", () => {
  test("da la fila de prospect_lugares", () => {
    expect(transformarLugar(BRUTO, opciones)).toEqual({
      id: BRUTO.id,
      nombre: "Clínica dental Mardental",
      categorias: ["dentistas"],
      categoria_overture: "dental_clinic",
      direccion: "C. de Oliva de Plasencia, 1",
      municipio: "Madrid",
      municipio_clave: "madrid",
      provincia: "Madrid",
      cp: "28044",
      lat: 40.3822,
      lon: -3.7512,
      telefono: "+34911995572",
      telefono_clave: "911995572",
      web: "http://www.mardental.org/",
      email: "mardental@mardental.org",
      redes: ["https://www.facebook.com/177407656022189"],
      fuentes: ["meta"],
      licencias: ["CDLA-Permissive-2.0"],
      confianza: 0.8827,
      release: "2026-09-23.1",
    });
  });

  test("una web que es una red social no cuenta como web; pasa a redes", () => {
    const f = transformarLugar({ ...BRUTO, webs: ["https://facebook.com/x", "clinica.es"], redes: null }, opciones);
    expect(f?.web).toBe("https://clinica.es");
    expect(f?.redes).toEqual(["https://facebook.com/x"]);
  });

  test("fuera los cerrados, los de poca confianza, los sin nombre, los de fuera de España y los de otras categorías", () => {
    expect(transformarLugar({ ...BRUTO, estado: "permanently_closed" }, opciones)).toBeNull();
    expect(transformarLugar({ ...BRUTO, confianza: 0.49 }, opciones)).toBeNull();
    expect(transformarLugar({ ...BRUTO, confianza: null }, opciones)).toBeNull();
    expect(transformarLugar({ ...BRUTO, nombre: "  " }, opciones)).toBeNull();
    expect(transformarLugar({ ...BRUTO, pais: "PT" }, opciones)).toBeNull();
    expect(transformarLugar({ ...BRUTO, primaria: "bank", jerarquia: ["services_and_business", "financial_service", "bank"] }, opciones)).toBeNull();
  });

  test("sin código postal español no hay provincia, pero el lugar se queda", () => {
    const f = transformarLugar({ ...BRUTO, cp: null, municipio: null, direccion: null, telefonos: null, webs: null, emails: [] }, opciones);
    expect(f).toMatchObject({ provincia: null, cp: null, municipio: null, municipio_clave: null, telefono: null, telefono_clave: null, web: null, email: null });
  });

  test("limpia espacios y emails mal formados", () => {
    const f = transformarLugar({ ...BRUTO, nombre: "  Clínica   Sol ", emails: ["no-es-un-email", " Info@Sol.es "] }, opciones);
    expect(f?.nombre).toBe("Clínica Sol");
    expect(f?.email).toBe("Info@Sol.es");
  });
});

describe("lugarAProspecto", () => {
  test("se guarda con source overture y la dirección completa", () => {
    const fila = transformarLugar(BRUTO, opciones);
    expect(lugarAProspecto(fila!, "Clínicas dentales", "madrid")).toEqual({
      source: "overture",
      external_id: BRUTO.id,
      name: "Clínica dental Mardental",
      sector: "Clínicas dentales",
      address: "C. de Oliva de Plasencia, 1, 28044 Madrid",
      city: "Madrid",
      province: "Madrid",
      phone: "+34911995572",
      website: "http://www.mardental.org/",
      email: "mardental@mardental.org",
      rating: null,
      reviews: null,
    });
  });

  test("sin municipio usa el buscado", () => {
    const fila = transformarLugar({ ...BRUTO, municipio: null, direccion: null }, opciones)!;
    expect(lugarAProspecto(fila, "Clínicas dentales", "Getafe")).toMatchObject({ city: "Getafe", address: null });
  });
});

describe("consultaOverture", () => {
  test("lee el release pedido, filtra España y las categorías en la propia consulta", () => {
    const sql = consultaOverture({ release: "2026-09-23.1", confianzaMinima: 0.5 });
    expect(sql).toContain("s3://overturemaps-us-west-2/release/2026-09-23.1/theme=places/type=place/*");
    expect(sql).toContain("addresses[1].country = 'ES'");
    expect(sql).toContain("confidence >= 0.5");
    expect(sql).toContain("'dental_clinic'");
    expect(sql).not.toContain("postcode LIKE");
  });

  test("con provincia filtra por el prefijo de su código postal", () => {
    expect(consultaOverture({ release: "2026-09-23.1", confianzaMinima: 0.6, cpPrefijo: "42" })).toContain("addresses[1].postcode LIKE '42%'");
  });

  test("no deja colar texto en la consulta", () => {
    expect(() => consultaOverture({ release: "x'; DROP TABLE", confianzaMinima: 0.5 })).toThrow();
    expect(() => consultaOverture({ release: "2026-09-23.1", confianzaMinima: 0.5, cpPrefijo: "4'" })).toThrow();
    expect(() => consultaOverture({ release: "2026-09-23.1", confianzaMinima: Number.NaN })).toThrow();
  });

  test("nodosOverture junta los de todas las categorías, sin repetir", () => {
    const n = nodosOverture();
    expect(n).toContain("gym");
    expect(new Set(n).size).toBe(n.length);
  });
});
