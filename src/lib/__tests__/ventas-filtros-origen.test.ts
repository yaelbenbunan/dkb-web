import { describe, expect, test } from "vitest";
import { filtrarPorOrigen, leerFiltroOrigen, opcionesOrigen } from "../ventas/filtros-origen";

const L = [
  { canal: "Meta", campana: "kd", etiquetas: ["kit-digital"] },
  { canal: "Web", campana: "web-299", etiquetas: [] },
  { canal: "Meta", campana: null, etiquetas: ["kit-digital", "promo"] },
  { canal: null, campana: null },
];

describe("filtros de origen", () => {
  test("opciones: valores presentes, sin repetir y ordenados", () => {
    expect(opcionesOrigen(L)).toEqual({ canales: ["Meta", "Web"], campanas: ["kd", "web-299"], etiquetas: ["kit-digital", "promo"] });
  });

  test("filtra por canal, campaña y etiqueta a la vez", () => {
    expect(filtrarPorOrigen(L, { canal: "Meta" })).toHaveLength(2);
    expect(filtrarPorOrigen(L, { canal: "Meta", etiqueta: "promo" })).toHaveLength(1);
    expect(filtrarPorOrigen(L, { campana: "web-299" })).toEqual([L[1]]);
    expect(filtrarPorOrigen(L, {})).toHaveLength(4);
  });

  test("lee el filtro de la URL ignorando vacíos", () => {
    expect(leerFiltroOrigen({ canal: "Meta", campana: "", etiqueta: undefined })).toEqual({ canal: "Meta" });
  });
});
