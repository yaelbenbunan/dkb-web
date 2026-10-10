import { describe, expect, test } from "vitest";
import { FILTROS_VACIOS, filtrarProspectos } from "../filtros";
import type { ProspectRow } from "../tipos";

const p = (extra: Partial<ProspectRow>): ProspectRow =>
  ({ id: "x", name: "Bar", city: "Madrid", sector: null, email: null, website: null, status: "nuevo", search_id: "s1", ...extra }) as ProspectRow;

const lista = [
  p({ id: "a", name: "Bar Pepe", email: "info@pepe.es", website: "https://pepe.es", status: "listo" }),
  p({ id: "b", name: "Casa Lola", city: "Getafe", status: "sin_contacto" }),
  p({ id: "c", name: "Taller Ruiz", email: "  ", website: "https://ruiz.es", status: "enviado", search_id: "s2" }),
];
const ids = (f: Partial<typeof FILTROS_VACIOS>) => filtrarProspectos(lista, { ...FILTROS_VACIOS, ...f }).map((x) => x.id);

describe("filtrarProspectos", () => {
  test("sin filtros devuelve todo", () => expect(ids({})).toEqual(["a", "b", "c"]));
  test("por estado", () => expect(ids({ estado: "listo" })).toEqual(["a"]));
  test("por búsqueda de origen", () => expect(ids({ busqueda: "s2" })).toEqual(["c"]));
  test("con y sin email; un email en blanco es no tener", () => {
    expect(ids({ email: "con" })).toEqual(["a"]);
    expect(ids({ email: "sin" })).toEqual(["b", "c"]);
  });
  test("con y sin web", () => {
    expect(ids({ web: "con" })).toEqual(["a", "c"]);
    expect(ids({ web: "sin" })).toEqual(["b"]);
  });
  test("texto libre sobre nombre, ciudad y email, sin distinguir mayúsculas ni acentos", () => {
    expect(ids({ texto: "GETAFE" })).toEqual(["b"]);
    expect(ids({ texto: "pepe.es" })).toEqual(["a"]);
    expect(ids({ texto: "lóla" })).toEqual(["b"]);
  });
  test("los filtros se combinan", () => expect(ids({ web: "con", estado: "enviado" })).toEqual(["c"]));
});
