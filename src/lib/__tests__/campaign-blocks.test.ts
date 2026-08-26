import { describe, expect, test } from "vitest";
import { blocksSchema, newBlock, sanitizeBlocks, DEFAULT_STYLE, type Block } from "../campaign-blocks";

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
