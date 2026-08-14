import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { KitDigitalSection } from "../KitDigitalSection";
import { KIT_SOLUCIONES } from "@/components/kit-digital/soluciones";

/** href de todos los enlaces renderizados. */
function hrefs(container: HTMLElement) {
  return Array.from(container.querySelectorAll("a")).map((a) =>
    a.getAttribute("href"),
  );
}

describe("KitDigitalSection", () => {
  test("declara que somos Agente Digitalizador adherido", () => {
    render(<KitDigitalSection />);
    expect(
      screen.getByRole("heading", { name: /agente digitalizador/i }),
    ).toBeInTheDocument();
  });

  test("lista las soluciones que cubre el bono", () => {
    render(<KitDigitalSection />);
    for (const s of KIT_SOLUCIONES) {
      expect(screen.getByText(s.title)).toBeInTheDocument();
    }
  });

  test("enlaza la convocatoria 2026 y el puesto de trabajo seguro", () => {
    const { container } = render(<KitDigitalSection />);
    const found = hrefs(container);
    expect(found).toContain("/kit-digital-2026");
    expect(found).toContain("/puesto-seguro");
  });

  test("no promete un importe concreto de la ayuda", () => {
    const { container } = render(<KitDigitalSection />);
    // La convocatoria 2026 aún no está publicada: una cifra envejece mal.
    expect(container.textContent).not.toMatch(/\d[\d.]*\s*€/);
  });
});
