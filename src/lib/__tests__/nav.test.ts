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

  // «Imagina tu web» se saca del menú a propósito (28-09-2026): la página sigue
  // existiendo y accesible por enlace directo, pero no se ofrece en la
  // navegación. Sin este test, el enlace vuelve en el siguiente retoque del
  // menú sin que nadie se dé cuenta de que se quitó por decisión.
  test("«Imagina tu web» no se ofrece en el menú", () => {
    // `readonly string[]` a propósito: con el `as const` de NAV_ITEMS, comparar
    // el href contra una ruta que ya no está en la lista es un error de tipos
    // («no overlap»). Eso es bueno —el tipo ya impide referenciarla— pero no
    // sustituye a este test, que es lo que impide volver a AÑADIRLA al array.
    const hrefs: readonly string[] = NAV_ITEMS.map((i) => i.href);
    expect(hrefs).not.toContain("/imagina-tu-web");
  });

  test("no hay hrefs duplicados", () => {
    const hrefs = NAV_ITEMS.map((i) => i.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
