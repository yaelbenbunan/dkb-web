import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { LineaDeTiempo } from "../LineaDeTiempo";

const PASOS = [
  { n: "01", t: "Traemos pacientes", d: "Campañas en Google y Meta." },
  { n: "02", t: "Nada se pierde", d: "Cada lead entra en un sistema ordenado." },
  { n: "03", t: "Sabemos quién vino", d: "Dos toques y ya está." },
];

describe("LineaDeTiempo", () => {
  test("pinta todos los pasos con su número, título y descripción", () => {
    render(<LineaDeTiempo pasos={PASOS} />);
    for (const p of PASOS) {
      expect(screen.getByText(p.n)).toBeInTheDocument();
      expect(screen.getByText(p.t)).toBeInTheDocument();
      expect(screen.getByText(p.d)).toBeInTheDocument();
    }
  });

  test("es una lista ordenada, porque el orden de los pasos es el mensaje", () => {
    const { container } = render(<LineaDeTiempo pasos={PASOS} />);
    const items = container.querySelectorAll("ol > li");
    expect(items).toHaveLength(PASOS.length);
    // El orden del DOM tiene que coincidir con el de los datos: si se
    // reordenara, la cronología que vende la sección dejaría de ser cierta.
    expect(items[0].textContent).toContain("Traemos pacientes");
    expect(items[2].textContent).toContain("Sabemos quién vino");
  });

  test("sin scroll todavía, el contenido se lee igual", () => {
    // El stub de IntersectionObserver de vitest.setup nunca dispara, así que
    // esto fija que la animación es un adorno: si no llega a ejecutarse, el
    // texto sigue estando y siendo legible.
    render(<LineaDeTiempo pasos={PASOS} />);
    expect(screen.getByText("Campañas en Google y Meta.")).toBeVisible();
  });
});
