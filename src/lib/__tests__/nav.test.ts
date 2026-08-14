import { describe, expect, test } from "vitest";
import { NAV_ITEMS } from "../nav";

describe("NAV_ITEMS", () => {
  test("incluye el Kit Digital apuntando a la convocatoria 2026", () => {
    const kit = NAV_ITEMS.find((i) => i.href === "/kit-digital-2026");
    expect(kit).toBeDefined();
    expect(kit?.label).toBe("Kit Digital");
  });

  test("el Kit Digital va antes de Casos de éxito", () => {
    const hrefs = NAV_ITEMS.map((i) => i.href);
    expect(hrefs.indexOf("/kit-digital-2026")).toBeLessThan(
      hrefs.indexOf("/casos-de-exito"),
    );
  });

  test("no hay hrefs duplicados", () => {
    const hrefs = NAV_ITEMS.map((i) => i.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
