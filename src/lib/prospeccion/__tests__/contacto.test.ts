import { describe, expect, test } from "vitest";
import { claveTexto, huellaWeb, normalizarTelefono, quitarDuplicados, separarDuplicados, webPropia } from "../contacto";

describe("webPropia", () => {
  test("añade el esquema y descarta redes sociales y basura", () => {
    expect(webPropia("clinica.es")).toBe("https://clinica.es");
    expect(webPropia("http://www.mardental.org/")).toBe("http://www.mardental.org/");
    expect(webPropia("https://www.facebook.com/123")).toBeNull();
    expect(webPropia("https://m.instagram.com/x")).toBeNull();
    expect(webPropia("mailto:hola@x.es")).toBeNull();
    expect(webPropia("localhost")).toBeNull();
    expect(webPropia(null)).toBeNull();
  });
});

describe("normalizarTelefono", () => {
  test("se queda con los nueve dígitos de un número español", () => {
    expect(normalizarTelefono("+34 911 99 55 72")).toBe("911995572");
    expect(normalizarTelefono("0034911995572")).toBe("911995572");
    expect(normalizarTelefono("914 72 32 08")).toBe("914723208");
    expect(normalizarTelefono("34911995572")).toBe("911995572");
  });

  test("los extranjeros conservan su prefijo y lo corto no cuenta", () => {
    expect(normalizarTelefono("+33 1 23 45 67 89")).toBe("33123456789");
    expect(normalizarTelefono("600")).toBeNull();
    expect(normalizarTelefono(null)).toBeNull();
  });
});

describe("huellaWeb", () => {
  test("ignora esquema, www, barra final y mayúsculas", () => {
    expect(huellaWeb("https://www.Clinica.es/")).toBe("clinica.es");
    expect(huellaWeb("http://clinica.es/madrid/")).toBe("clinica.es/madrid");
    expect(huellaWeb("https://facebook.com/x")).toBeNull();
    expect(huellaWeb(null)).toBeNull();
  });
});

describe("claveTexto", () => {
  test("sin tildes, en minúsculas y con espacios simples", () => {
    expect(claveTexto("  Alcalá de  Henares ")).toBe("alcala de henares");
    expect(claveTexto("MÓSTOLES")).toBe("mostoles");
    expect(claveTexto("L'Hospitalet de Llobregat")).toBe("l'hospitalet de llobregat");
    expect(claveTexto(null)).toBe("");
  });
});

describe("quitarDuplicados", () => {
  const base = { city: "Madrid", phone: null as string | null, website: null as string | null };

  test("fuera los que comparten teléfono con uno que ya está", () => {
    const existentes = [{ ...base, phone: "+34 911 99 55 72" }];
    const r = quitarDuplicados([{ ...base, phone: "911995572" }, { ...base, phone: "910000000" }], existentes);
    expect(r.map((p) => p.phone)).toEqual(["910000000"]);
  });

  test("la misma web solo cuenta en el mismo municipio: las cadenas comparten dominio", () => {
    const existentes = [{ ...base, website: "https://www.vitaldent.com/" }];
    const r = quitarDuplicados(
      [
        { ...base, website: "http://vitaldent.com" },
        { ...base, city: "Getafe", website: "http://vitaldent.com" },
      ],
      existentes,
    );
    expect(r.map((p) => p.city)).toEqual(["Getafe"]);
  });

  test("también quita duplicados entre los propios candidatos", () => {
    const r = quitarDuplicados([{ ...base, phone: "911995572" }, { ...base, phone: "+34911995572" }], []);
    expect(r).toHaveLength(1);
  });

  test("sin teléfono ni web no se puede comparar: se queda", () => {
    expect(quitarDuplicados([base, base], [base])).toHaveLength(2);
  });
});

describe("separarDuplicados", () => {
  const base = { city: "Madrid", phone: null as string | null, website: null as string | null };

  test("distingue los que ya estaban de los repetidos entre los propios candidatos", () => {
    const existentes = [{ ...base, phone: "911000001" }];
    const r = separarDuplicados(
      [
        { ...base, phone: "+34 911 000 001" }, // ya estaba
        { ...base, phone: "911000002" },
        { ...base, phone: "911000002" }, // repetido (otra sede con el mismo teléfono)
        { ...base, website: "https://cadena.es" },
        { ...base, website: "http://www.cadena.es/" }, // repetido (misma web en el municipio)
      ],
      existentes,
    );
    expect(r.unicos).toHaveLength(2);
    expect(r.yaEstaban).toBe(1);
    expect(r.repetidos).toBe(2);
  });
});
