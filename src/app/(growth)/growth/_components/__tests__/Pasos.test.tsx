import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Pasos } from "../Pasos";

const PASOS = [
  { n: "01", t: "Traemos pacientes", d: "Campañas en Google y Meta." },
  { n: "02", t: "A tu agenda", d: "La cita se escribe en tu calendario." },
  { n: "03", t: "Tu rentabilidad", d: "Quién acudió y cuánto facturó." },
];

describe("Pasos", () => {
  test("pinta cada paso con su número, título y descripción", () => {
    render(<Pasos pasos={PASOS} />);
    for (const p of PASOS) {
      expect(screen.getByText(p.n)).toBeInTheDocument();
      expect(screen.getByText(p.t)).toBeInTheDocument();
      expect(screen.getByText(p.d)).toBeInTheDocument();
    }
  });

  test("es una lista ordenada, porque el orden de los pasos es el mensaje", () => {
    const { container } = render(<Pasos pasos={PASOS} />);
    const items = container.querySelectorAll("ol > li");
    expect(items).toHaveLength(PASOS.length);
    // Si se reordenara, la cronología que vende la sección dejaría de ser
    // cierta: primero se traen, luego se agendan, luego se mide.
    expect(items[0].textContent).toContain("Traemos pacientes");
    expect(items[2].textContent).toContain("Tu rentabilidad");
  });

  test("los dibujos no cuentan nada que el texto no diga", () => {
    // Van con aria-hidden a propósito: son la versión mirada de lo que ya está
    // escrito. Si aportaran información propia, quien use lector de pantalla
    // se quedaría sin ella.
    const { container } = render(<Pasos pasos={PASOS} />);
    for (const svg of container.querySelectorAll("svg")) {
      expect(svg.getAttribute("aria-hidden")).toBe("true");
    }
  });

  test("aguanta más pasos de los que hay dibujos", () => {
    // El día que alguien añada un cuarto paso, la sección no puede reventar.
    const cuatro = [...PASOS, { n: "04", t: "Extra", d: "Uno más." }];
    render(<Pasos pasos={cuatro} />);
    expect(screen.getByText("Extra")).toBeInTheDocument();
  });
});
