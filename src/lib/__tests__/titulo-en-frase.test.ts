import { describe, expect, test } from "vitest";
import { tituloEnFrase } from "../titulo-en-frase";

describe("tituloEnFrase", () => {
  test("las siglas se quedan como están", () => {
    expect(tituloEnFrase("SEM")).toBe("SEM");
    expect(tituloEnFrase("SEO")).toBe("SEO");
  });

  test("los nombres con mayúscula interna tampoco se tocan", () => {
    expect(tituloEnFrase("Anuncios en ChatGPT")).toBe("Anuncios en ChatGPT");
    expect(tituloEnFrase("Social & Paid Media")).toBe("Social & Paid Media");
  });

  test("un título normal se lee en minúscula dentro de la frase", () => {
    expect(tituloEnFrase("Desarrollo web")).toBe("desarrollo web");
    expect(tituloEnFrase("Email marketing")).toBe("email marketing");
    expect(tituloEnFrase("Diseño gráfico")).toBe("diseño gráfico");
  });

  test("no revienta con cadenas raras", () => {
    expect(tituloEnFrase("")).toBe("");
    expect(tituloEnFrase("E")).toBe("e");
  });
});
