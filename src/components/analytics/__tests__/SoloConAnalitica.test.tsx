import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

const ruta = vi.hoisted(() => ({ actual: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => ruta.actual }));

import { SoloConAnalitica } from "@/components/analytics/SoloConAnalitica";
import { esRutaSinAnalitica } from "@/lib/rutas-sin-analitica";

describe("sin analítica en /alta", () => {
  test("esRutaSinAnalitica: /alta y sus hijas, nada más", () => {
    expect(esRutaSinAnalitica("/alta/AbC_123")).toBe(true);
    expect(esRutaSinAnalitica("/alta")).toBe(true);
    expect(esRutaSinAnalitica("/altavoz")).toBe(false);
    expect(esRutaSinAnalitica("/")).toBe(false);
    expect(esRutaSinAnalitica("/panel/ventas/altas")).toBe(false);
    expect(esRutaSinAnalitica(null)).toBe(false);
  });

  test("en /alta/<token> no pinta lo que envuelve; en el resto, sí", () => {
    ruta.actual = "/alta/" + "A".repeat(43);
    const { unmount } = render(<SoloConAnalitica><span>gtm</span></SoloConAnalitica>);
    expect(screen.queryByText("gtm")).not.toBeInTheDocument();
    unmount();
    ruta.actual = "/contacto";
    render(<SoloConAnalitica><span>gtm</span></SoloConAnalitica>);
    expect(screen.getByText("gtm")).toBeInTheDocument();
  });
});
