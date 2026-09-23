import { describe, expect, test } from "vitest";
import {
  SIN_CAMPANA,
  SIN_CANAL,
  campanaDeLead,
  canalDeLead,
  coincideBusqueda,
  filtrarLeads,
  opcionesDeCampana,
  opcionesDeCanal,
} from "../panel-filtros";

describe("canalDeLead / campanaDeLead", () => {
  test("un canal o campaña con texto se devuelve tal cual", () => {
    expect(canalDeLead({ channel: "Meta" })).toBe("Meta");
    expect(campanaDeLead({ campaign: "Kit Digital 2026" })).toBe("Kit Digital 2026");
  });

  test("null cuenta como «Sin canal» / «Sin campaña»", () => {
    expect(canalDeLead({ channel: null })).toBe(SIN_CANAL);
    expect(campanaDeLead({ campaign: null })).toBe(SIN_CAMPANA);
  });

  test("una cadena vacía o solo espacios también cuenta como sin valor", () => {
    expect(canalDeLead({ channel: "   " })).toBe(SIN_CANAL);
    expect(campanaDeLead({ campaign: "" })).toBe(SIN_CAMPANA);
  });
});

describe("opcionesDeCanal / opcionesDeCampana", () => {
  const leads = [
    { channel: "Meta", campaign: "Kit Digital 2026" },
    { channel: "Meta", campaign: "Pmax" },
    { channel: null, campaign: null },
    { channel: "google ads", campaign: "Pmax" },
  ];

  test("agrupa y cuenta, incluyendo el grupo «Sin canal»/«Sin campaña»", () => {
    expect(opcionesDeCanal(leads)).toEqual([
      { valor: "google ads", recuento: 1 },
      { valor: "Meta", recuento: 2 },
      { valor: SIN_CANAL, recuento: 1 },
    ]);
    expect(opcionesDeCampana(leads)).toEqual([
      { valor: "Kit Digital 2026", recuento: 1 },
      { valor: "Pmax", recuento: 2 },
      { valor: SIN_CAMPANA, recuento: 1 },
    ]);
  });

  test("con la lista vacía no hay opciones", () => {
    expect(opcionesDeCanal([])).toEqual([]);
    expect(opcionesDeCampana([])).toEqual([]);
  });

  test("las opciones salen ordenadas alfabéticamente (es)", () => {
    const conAcentos = [
      { channel: "Álvaro", campaign: null },
      { channel: "Bing", campaign: null },
      { channel: "Ábaco", campaign: null },
    ];
    expect(opcionesDeCanal(conAcentos).map((o) => o.valor)).toEqual(["Ábaco", "Álvaro", "Bing"]);
  });
});

describe("coincideBusqueda", () => {
  const lead = { name: "María López", phone: "+34600000000", email: "maria@ejemplo.com", campaign: "Pmax" };

  test("sin texto de búsqueda, coincide siempre", () => {
    expect(coincideBusqueda(lead, "")).toBe(true);
    expect(coincideBusqueda(lead, "   ")).toBe(true);
  });

  test("es insensible a mayúsculas, como ya lo era en la lista y el tablero", () => {
    expect(coincideBusqueda(lead, "MARÍA")).toBe(true);
    expect(coincideBusqueda(lead, "lópez")).toBe(true);
    expect(coincideBusqueda(lead, "pmax")).toBe(true);
  });

  test("busca en nombre, teléfono, email y campaña", () => {
    expect(coincideBusqueda(lead, "600000000")).toBe(true);
    expect(coincideBusqueda(lead, "ejemplo.com")).toBe(true);
    expect(coincideBusqueda(lead, "Pmax")).toBe(true);
  });

  test("no coincide si el texto no aparece en ningún campo", () => {
    expect(coincideBusqueda(lead, "no está")).toBe(false);
  });

  test("campos null no rompen la búsqueda", () => {
    const sinDatos = { name: null, phone: null, email: null, campaign: null };
    expect(coincideBusqueda(sinDatos, "algo")).toBe(false);
    expect(coincideBusqueda(sinDatos, "")).toBe(true);
  });
});

describe("filtrarLeads", () => {
  const leads = [
    { id: "1", channel: "Meta", campaign: "Pmax", name: "Ana", phone: null, email: null },
    { id: "2", channel: "Meta", campaign: "Kit Digital 2026", name: "Bea", phone: null, email: null },
    { id: "3", channel: "google ads", campaign: "Pmax", name: "Carla", phone: null, email: null },
    { id: "4", channel: null, campaign: null, name: "Denís", phone: null, email: null },
  ];

  test("sin filtros (o «todos»), devuelve todo", () => {
    expect(filtrarLeads(leads, {})).toHaveLength(4);
    expect(filtrarLeads(leads, { canal: "todos", campana: "todos" })).toHaveLength(4);
  });

  test("filtra solo por canal", () => {
    expect(filtrarLeads(leads, { canal: "Meta" }).map((l) => l.id)).toEqual(["1", "2"]);
  });

  test("filtra solo por campaña", () => {
    expect(filtrarLeads(leads, { campana: "Pmax" }).map((l) => l.id)).toEqual(["1", "3"]);
  });

  test("filtra por «Sin canal» y «Sin campaña»", () => {
    expect(filtrarLeads(leads, { canal: SIN_CANAL }).map((l) => l.id)).toEqual(["4"]);
    expect(filtrarLeads(leads, { campana: SIN_CAMPANA }).map((l) => l.id)).toEqual(["4"]);
  });

  test("canal y campaña se combinan (AND)", () => {
    expect(filtrarLeads(leads, { canal: "Meta", campana: "Pmax" }).map((l) => l.id)).toEqual(["1"]);
  });

  test("se combinan también con la búsqueda", () => {
    expect(filtrarLeads(leads, { canal: "Meta", query: "bea" }).map((l) => l.id)).toEqual(["2"]);
  });

  test("una combinación sin resultados devuelve una lista vacía", () => {
    expect(filtrarLeads(leads, { canal: "Meta", campana: SIN_CAMPANA })).toEqual([]);
  });
});
