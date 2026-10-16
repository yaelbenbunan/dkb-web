import { describe, expect, test } from "vitest";
import { PROVINCIAS, provinciaDeCp, provinciaDeTexto } from "../provincias";

describe("provinciaDeCp", () => {
  test("los dos primeros dígitos del código postal dan la provincia", () => {
    expect(provinciaDeCp("28044")).toBe("Madrid");
    expect(provinciaDeCp("42001")).toBe("Soria");
    expect(provinciaDeCp("08001")).toBe("Barcelona");
    expect(provinciaDeCp(" 35500 ")).toBe("Las Palmas");
    expect(provinciaDeCp("52001")).toBe("Melilla");
  });

  test("un código que no es español da null", () => {
    expect(provinciaDeCp("53000")).toBeNull();
    expect(provinciaDeCp("2804")).toBeNull();
    expect(provinciaDeCp("ABCDE")).toBeNull();
    expect(provinciaDeCp(null)).toBeNull();
  });
});

describe("provinciaDeTexto", () => {
  test("acepta el nombre oficial y los de siempre, sin tildes ni mayúsculas", () => {
    expect(provinciaDeTexto("bizkaia")).toBe("Bizkaia");
    expect(provinciaDeTexto("Vizcaya")).toBe("Bizkaia");
    expect(provinciaDeTexto("Gerona")).toBe("Girona");
    expect(provinciaDeTexto("La Coruña")).toBe("A Coruña");
    expect(provinciaDeTexto("Baleares")).toBe("Illes Balears");
    expect(provinciaDeTexto("Alava")).toBe("Araba/Álava");
    expect(provinciaDeTexto("CÁCERES")).toBe("Cáceres");
    expect(provinciaDeTexto("Getafe")).toBeNull();
  });

  test("hay 52, una por código", () => {
    expect(Object.keys(PROVINCIAS)).toHaveLength(52);
  });
});
