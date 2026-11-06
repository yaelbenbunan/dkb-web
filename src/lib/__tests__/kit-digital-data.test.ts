import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ALL_DEVICES, MIN_PAY, brandsText } from "../kit-digital-data";

// El contenido (qué equipos y a qué precio) lo vigila
// scripts/kit-catalogo-check.mjs contra kitdigital.ecomputer.es. Aquí solo
// comprobamos que lo que hay está bien formado.
describe("catálogo Kit Digital", () => {
  it("slugs propios y de ecomputer únicos", () => {
    expect(new Set(ALL_DEVICES.map((d) => d.slug)).size).toBe(ALL_DEVICES.length);
    expect(new Set(ALL_DEVICES.map((d) => d.source)).size).toBe(ALL_DEVICES.length);
  });

  it("el bono descuenta exactamente 1.000€", () => {
    for (const d of ALL_DEVICES) expect(d.priceTotal - d.pricePay, d.slug).toBe(1000);
  });

  it("cada equipo tiene su foto en public/", () => {
    for (const d of ALL_DEVICES)
      expect(existsSync(join(process.cwd(), "public", d.image)), d.image).toBe(true);
  });

  it("MIN_PAY es el menor precio del catálogo", () => {
    expect(MIN_PAY).toBe(Math.min(...ALL_DEVICES.map((d) => d.pricePay)));
  });

  it("brandsText une marcas sin repetir", () => {
    const mk = (brand: string) => ({ ...ALL_DEVICES[0], brand });
    expect(brandsText([mk("Dell"), mk("Asus"), mk("Dell"), mk("Lenovo")])).toBe("Dell, Asus y Lenovo");
    expect(brandsText([mk("Apple")])).toBe("Apple");
  });
});
