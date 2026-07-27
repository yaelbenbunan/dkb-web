import { describe, expect, test } from "vitest";
import { blocksSchema, newBlock, DEFAULT_STYLE } from "../campaign-blocks";

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
