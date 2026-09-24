import { describe, expect, it } from "vitest";
import { elegirSecuencia } from "../eleccion";

const s = (id: string, estado: string, anuncios: string[] = []) => ({ id, estado, anuncios });

describe("elegirSecuencia", () => {
  it("prefiere la que declara servir a ese anuncio", () => {
    const secuencias = [s("general", "activa"), s("psico", "activa", ["120252112386740343"])];
    expect(elegirSecuencia(secuencias, "120252112386740343")?.id).toBe("psico");
  });

  it("cae en la activa sin anuncios cuando ninguna lo cubre", () => {
    const secuencias = [s("general", "activa"), s("psico", "activa", ["otro"])];
    expect(elegirSecuencia(secuencias, "120252112386740343")?.id).toBe("general");
  });

  it("ignora las que no están activas, aunque declaren el anuncio", () => {
    // Un borrador a medio escribir no puede hablar con un cliente.
    const secuencias = [s("borrador", "borrador", ["A"]), s("archivada", "archivada", ["A"])];
    expect(elegirSecuencia(secuencias, "A")).toBeNull();
  });

  it("devuelve null si no hay ninguna activa", () => {
    expect(elegirSecuencia([], "A")).toBeNull();
    expect(elegirSecuencia([s("b", "borrador")], null)).toBeNull();
  });

  it("sin anuncio usa la activa general", () => {
    expect(elegirSecuencia([s("general", "activa")], null)?.id).toBe("general");
  });
});
