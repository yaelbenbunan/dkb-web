import { render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Planes } from "../Planes";

/** La fila de la tabla (escritorio) cuyo rótulo es `texto`. */
function fila(texto: string) {
  const celda = screen.getAllByText(texto).find((el) => el.closest("tr"));
  return celda!.closest("tr")!;
}

describe("Planes", () => {
  test("el informe mensual va solo en el avanzado", () => {
    // Decidido el 25 de septiembre de 2026: es lo que distingue los planes,
    // junto con los canales.
    render(<Planes />);
    const celdas = within(fila("Informe mensual de resultados")).getAllByRole("cell");
    expect(within(celdas[1]).queryByLabelText("Incluido")).toBeNull();
    expect(within(celdas[2]).getByLabelText("Incluido")).toBeInTheDocument();
  });

  test("un canal en el básico y dos en el avanzado", () => {
    render(<Planes />);
    const texto = fila("Campañas de publicidad").textContent ?? "";
    expect(texto).toContain("1 canal");
    expect(texto).toContain("2 canales");
  });

  test("la landing de captación va en los dos", () => {
    render(<Planes />);
    expect(within(fila("Landing de captación")).getAllByLabelText("Incluido")).toHaveLength(2);
  });

  test("no promete nada de lo que Growth ya no incluye", () => {
    // El sistema de pacientes, la agenda, el panel y los recordatorios salieron
    // de la oferta. Una fila que los nombre vende algo que no se entrega.
    const { container } = render(<Planes />);
    expect(container.textContent).not.toMatch(/sistema de|agenda|panel|recordatorio/i);
  });

  test("la cuota de alta sigue siendo 150 € y 200 €", () => {
    render(<Planes />);
    const texto = fila("Cuota de alta (una sola vez)").textContent ?? "";
    expect(texto).toContain("150 €");
    expect(texto).toContain("200 €");
  });
});
