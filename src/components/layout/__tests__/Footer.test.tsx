import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Footer } from "../Footer";

/** Mapa href -> texto de todos los enlaces del footer. */
function links(container: HTMLElement) {
  return Array.from(container.querySelectorAll("a")).map((a) => ({
    href: a.getAttribute("href"),
    text: a.textContent?.trim() ?? "",
  }));
}

describe("Footer", () => {
  test("enlaza la convocatoria 2026", () => {
    const { container } = render(<Footer />);
    const kit = links(container).find((l) => l.href === "/kit-digital-2026");
    expect(kit).toBeDefined();
  });

  test("enlaza el puesto de trabajo seguro con una etiqueta que lo distingue", () => {
    const { container } = render(<Footer />);
    const puesto = links(container).find((l) => l.href === "/puesto-seguro");
    expect(puesto).toBeDefined();
    // Antes ponía "Kit Digital", ambiguo ahora que la convocatoria está aparte.
    expect(puesto?.text).toMatch(/puesto/i);
  });
});
