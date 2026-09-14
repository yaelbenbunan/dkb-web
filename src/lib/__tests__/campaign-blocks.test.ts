import { describe, expect, test } from "vitest";
import {
  blocksSchema,
  newBlock,
  sanitizeBlocks,
  getSectionSpacing,
  setSectionSpacing,
  MIN_SECTION_SPACING,
  MAX_SECTION_SPACING,
  DEFAULT_STYLE,
  type Block,
} from "../campaign-blocks";

describe("campaign-blocks", () => {
  test("valida un arreglo de bloques correcto", () => {
    const blocks = [
      { id: "a", type: "hero", props: { title: "Hola" } },
      { id: "b", type: "button", props: { label: "Ir", url: "https://x.com" } },
      { id: "c", type: "footer", props: { orgLine: "dinkbit", unsubscribe: true } },
    ];
    expect(blocksSchema.safeParse(blocks).success).toBe(true);
  });
  test("rechaza tipo desconocido", () => {
    expect(blocksSchema.safeParse([{ id: "x", type: "nope", props: {} }]).success).toBe(false);
  });
  test("rechaza button sin url", () => {
    expect(blocksSchema.safeParse([{ id: "x", type: "button", props: { label: "Ir" } }]).success).toBe(false);
  });
  test("newBlock genera bloque válido con id", () => {
    const b = newBlock("paragraph");
    expect(b.type).toBe("paragraph");
    expect(typeof b.id).toBe("string");
    expect(blocksSchema.safeParse([b]).success).toBe(true);
  });
  test("DEFAULT_STYLE trae accent de marca", () => {
    expect(DEFAULT_STYLE.accentHex).toMatch(/^#?[0-9a-fA-F]{6}$/);
  });
});

describe("sanitizeBlocks", () => {
  test("limpia el HTML de párrafo, hero y caja antes de guardar", () => {
    const sucios: Block[] = [
      { id: "1", type: "paragraph", props: { text: "x", html: '<b>ok</b><script>alert(1)</script>' } },
      { id: "2", type: "hero", props: { title: "T", bodyHtml: '<div onclick="x()">hola</div>' } },
      { id: "3", type: "textbox", props: { html: '<iframe src="https://evil.com"></iframe>aviso' } },
    ];
    const limpios = sanitizeBlocks(sucios);
    expect(limpios[0].props).toMatchObject({ html: "<b>ok</b>" });
    expect(limpios[1].props).toMatchObject({ bodyHtml: "hola" });
    expect(limpios[2].props).toMatchObject({ html: "aviso" });
  });

  test("no toca los bloques sin texto enriquecido", () => {
    const bloques: Block[] = [
      { id: "1", type: "button", props: { label: "Ir", url: "https://x.com" } },
      { id: "2", type: "divider", props: {} },
      { id: "3", type: "paragraph", props: { text: "solo plano" } },
    ];
    expect(sanitizeBlocks(bloques)).toEqual(bloques);
  });

  test("lo saneado sigue validando contra el schema", () => {
    const b = sanitizeBlocks([newBlock("textbox")]);
    expect(blocksSchema.safeParse(b).success).toBe(true);
  });
});

describe("estilos por apartado del hero", () => {
  test("cada nodo guarda su propio color, tamaño, alineación y formato", () => {
    const blocks = [
      {
        id: "h",
        type: "hero",
        props: {
          title: "T",
          titleStyle: { color: "#ff0000", size: 34, align: "center", bold: true },
          eyebrowStyle: { size: 11, italic: true },
          bodyStyle: { color: "#334155", align: "justify", underline: true },
          cta: { label: "Ir", url: "https://dinkbit.es", background: "#00ff00", style: { size: 18 } },
        },
      },
    ];
    expect(blocksSchema.safeParse(blocks).success).toBe(true);
  });

  test("rechaza un tamaño fuera de rango o un color que no es hex", () => {
    const tooBig = [{ id: "h", type: "hero", props: { title: "T", titleStyle: { size: 200 } } }];
    const badColor = [{ id: "h", type: "hero", props: { title: "T", titleStyle: { color: "rojo" } } }];
    expect(blocksSchema.safeParse(tooBig).success).toBe(false);
    expect(blocksSchema.safeParse(badColor).success).toBe(false);
  });

  test("el CTA del hero exige una URL válida", () => {
    const blocks = [{ id: "h", type: "hero", props: { title: "T", cta: { label: "Ir", url: "no-url" } } }];
    expect(blocksSchema.safeParse(blocks).success).toBe(false);
  });
});

describe("espaciado entre secciones", () => {
  const base: Block[] = [
    { id: "1", type: "paragraph", props: { text: "a" } },
    { id: "f", type: "footer", props: { orgLine: "dinkbit", unsubscribe: true } },
  ];

  test("sin tocar el slider no hay espaciado guardado", () => {
    expect(getSectionSpacing(base)).toBeUndefined();
  });

  test("el slider escribe el mismo valor en todas las secciones", () => {
    const next = setSectionSpacing(base, 40);
    expect(next.every((b) => b.spacing === 40)).toBe(true);
    expect(getSectionSpacing(next)).toBe(40);
  });

  test("el 0 es un valor válido, no un 'sin definir'", () => {
    const next = setSectionSpacing(base, 0);
    expect(getSectionSpacing(next)).toBe(0);
    expect(blocksSchema.safeParse(next).success).toBe(true);
  });

  test("los valores fuera de rango se recortan al mínimo y al máximo", () => {
    expect(getSectionSpacing(setSectionSpacing(base, -10))).toBe(MIN_SECTION_SPACING);
    expect(getSectionSpacing(setSectionSpacing(base, 999))).toBe(MAX_SECTION_SPACING);
  });

  test("un spacing inválido en la base de datos no valida", () => {
    expect(blocksSchema.safeParse([{ id: "1", type: "divider", props: {}, spacing: 999 }]).success).toBe(false);
  });
});
