import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Contador } from "../Contador";
import { Hueco } from "../Hueco";
import GraciasPage from "@/app/(deporte)/proveedores-deportivos/gracias/page";

describe("piezas", () => {
  test("Hueco se marca como placeholder", () => {
    const { container } = render(<Hueco>[TESTIMONIO REAL]</Hueco>);
    expect(container.querySelector("[data-placeholder]")).toHaveTextContent("[TESTIMONIO REAL]");
  });

  test("Contador sin dato real enseña [X] y no inventa un número", () => {
    const { container } = render(<Contador valor={null} etiqueta="muestras enviadas" />);
    expect(container.querySelector("[data-placeholder]")).toHaveTextContent("[X]");
  });

  test("Contador con dato lo enseña entero sin IntersectionObserver (jsdom)", () => {
    render(<Contador valor={120} sufijo="+" etiqueta="centros" />);
    expect(screen.getByText("120+")).toBeInTheDocument();
  });

  test("la página de gracias lleva a WhatsApp con el texto ya escrito", () => {
    render(<GraciasPage />);
    const a = screen.getByRole("link", { name: /WhatsApp/i });
    expect(a.getAttribute("href")).toContain("wa.me");
    expect(decodeURIComponent(a.getAttribute("href")!)).toContain("Pack Campaña + CRM");
  });
});
