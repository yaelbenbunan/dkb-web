import { describe, expect, test } from "vitest";
import {
  MAX_PREHEADER_LENGTH,
  RECOMMENDED_MAX_LENGTH,
  fallbackPreheader,
  preheaderLengthHint,
  renderPreheaderHtml,
  sanitizePreheader,
} from "../email-preheader";

describe("sanitizePreheader", () => {
  test("deja una sola línea: fuera saltos, tabuladores y espacios de más", () => {
    expect(sanitizePreheader("  Dos plazas\n\tlibres  en  mayo  ")).toBe("Dos plazas libres en mayo");
  });
  test("sin texto aprovechable devuelve cadena vacía", () => {
    expect(sanitizePreheader(null)).toBe("");
    expect(sanitizePreheader(undefined)).toBe("");
    expect(sanitizePreheader("   \n  ")).toBe("");
  });
  test("recorta al tope duro", () => {
    const largo = "a".repeat(MAX_PREHEADER_LENGTH + 50);
    expect(sanitizePreheader(largo)).toHaveLength(MAX_PREHEADER_LENGTH);
  });
});

describe("preheaderLengthHint", () => {
  test("clasifica vacío, corto, en rango y pasado", () => {
    expect(preheaderLengthHint("")).toBe("vacio");
    expect(preheaderLengthHint("Muy corto")).toBe("corto");
    expect(preheaderLengthHint("a".repeat(60))).toBe("ok");
    expect(preheaderLengthHint("a".repeat(RECOMMENDED_MAX_LENGTH + 1))).toBe("largo");
  });
});

describe("renderPreheaderHtml", () => {
  test("sin texto no pinta nada", () => {
    expect(renderPreheaderHtml("")).toBe("");
    expect(renderPreheaderHtml("   ")).toBe("");
  });
  test("queda oculto en el cliente de correo", () => {
    const html = renderPreheaderHtml("Dos plazas libres en mayo");
    expect(html).toContain("display:none");
    expect(html).toContain("font-size:1px");
    expect(html).toContain("color:transparent");
    expect(html).toContain("max-height:0");
    expect(html).toContain("mso-hide:all");
    expect(html).toContain("Dos plazas libres en mayo");
  });
  test("rellena con caracteres invisibles para que no se arrastre el cuerpo", () => {
    const html = renderPreheaderHtml("Hola");
    expect(html).toContain("&#847;");
    expect(html.match(/&nbsp;/g)?.length ?? 0).toBeGreaterThan(50);
  });
  test("un preheader ya largo apenas necesita relleno", () => {
    const corto = renderPreheaderHtml("Hola");
    const largo = renderPreheaderHtml("a".repeat(RECOMMENDED_MAX_LENGTH));
    expect((largo.match(/&nbsp;/g)?.length ?? 0)).toBeLessThan(corto.match(/&nbsp;/g)!.length);
  });
  test("escapa el HTML del texto", () => {
    const html = renderPreheaderHtml('<script>alert("x")</script>');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("fallbackPreheader", () => {
  test("coge la primera línea con contenido del cuerpo", () => {
    expect(fallbackPreheader(["", "  ", "Bienvenido a dinkbit", "Segunda línea"])).toBe(
      "Bienvenido a dinkbit",
    );
  });
  test("recorta sin partir palabras y deja puntos suspensivos", () => {
    const linea = "palabra ".repeat(40).trim();
    const out = fallbackPreheader([linea]);
    expect(out.length).toBeLessThanOrEqual(RECOMMENDED_MAX_LENGTH + 1);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toContain("palabr…");
  });
  test("sin líneas útiles devuelve cadena vacía", () => {
    expect(fallbackPreheader([])).toBe("");
    expect(fallbackPreheader(["", "   "])).toBe("");
  });
});
