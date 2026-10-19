import { describe, expect, test } from "vitest";
import { cartaDeProspecto, pdfCarta, paraWinAnsi } from "../carta";

const P = {
  name: "RAVAC BRANDS GROUP SL",
  address: "C/ BLAS CABRERA 13 4 IZ, Madrid",
  city: "Madrid",
  province: "Madrid",
};
const HOY = new Date("2026-10-19T10:00:00Z");

describe("cartaDeProspecto", () => {
  const c = cartaDeProspecto(P, HOY);

  test("va a la sociedad, a la atención de la dirección, sin nombre de persona", () => {
    expect(c.destinatario).toEqual([
      "A la atención de la dirección",
      "RAVAC BRANDS GROUP SL",
      "C/ BLAS CABRERA 13 4 IZ",
      "Madrid (Madrid)",
    ]);
  });

  test("fecha en castellano", () => {
    expect(c.lugarYFecha).toBe("San Sebastián de los Reyes, 19 de octubre de 2026");
  });

  test("el pie informa del origen de los datos, la base y cómo oponerse", () => {
    expect(c.pie).toContain("Boletín Oficial del Registro Mercantil");
    expect(c.pie).toContain("interés legítimo");
    expect(c.pie).toContain("hola@dinkbit.es");
    expect(c.pie).toContain("B88317391");
    expect(c.pie).toContain("https://www.dinkbit.es/privacidad");
  });

  test("el cuerpo nombra a la empresa", () => {
    expect(c.cuerpo.join(" ")).toContain("RAVAC BRANDS GROUP SL");
  });

  test("sin municipio en la dirección, la dirección entera", () => {
    const d = cartaDeProspecto({ ...P, address: "C/ MAYOR 1", city: null, province: "Soria" }, HOY).destinatario;
    expect(d.slice(2)).toEqual(["C/ MAYOR 1", "Soria"]);
  });
});

describe("paraWinAnsi", () => {
  test("conserva tildes, eñes, ordinales y euro; cambia lo que la fuente no tiene", () => {
    expect(paraWinAnsi("Ñandú 4ª º €")).toBe("Ñandú 4ª º €");
    expect(paraWinAnsi("Ŀl ✓ 中")).toBe("?l ? ?");
    expect(paraWinAnsi("“comillas” – guion")).toBe("“comillas” – guion");
  });
});

describe("pdfCarta", () => {
  test("genera un PDF de una página", async () => {
    const bytes = await pdfCarta(cartaDeProspecto({ ...P, name: "ÑOÑO ✓ SL" }, HOY));
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(1000);
  });
});
