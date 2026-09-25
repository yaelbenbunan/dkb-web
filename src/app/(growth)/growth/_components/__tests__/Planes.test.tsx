import { render, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Planes } from "../Planes";

/** La tarjeta de un plan y la línea de esa tarjeta que empieza por `texto`. */
function linea(container: HTMLElement, plan: "basico" | "avanzado", texto: string) {
  const tarjeta = container.querySelector<HTMLElement>(`[data-plan="${plan}"]`)!;
  const li = [...tarjeta.querySelectorAll("li")].find((l) => l.textContent?.startsWith(texto));
  return li!;
}

describe("Planes", () => {
  test("el informe mensual va solo en el avanzado", () => {
    // Decidido el 25 de septiembre de 2026: es lo que distingue los planes,
    // junto con los canales.
    const { container } = render(<Planes />);
    const t = "Informe mensual de resultados";
    expect(within(linea(container, "basico", t)).getByLabelText("No incluido")).toBeInTheDocument();
    expect(within(linea(container, "avanzado", t)).getByLabelText("Incluido")).toBeInTheDocument();
  });

  test("un canal en el básico y dos en el avanzado", () => {
    const { container } = render(<Planes />);
    expect(linea(container, "basico", "Campañas de publicidad").textContent).toContain("1 canal");
    expect(linea(container, "avanzado", "Campañas de publicidad").textContent).toContain("2 canales");
  });

  test("la landing de captación va en los dos", () => {
    const { container } = render(<Planes />);
    for (const plan of ["basico", "avanzado"] as const) {
      expect(within(linea(container, plan, "Landing de captación")).getByLabelText("Incluido")).toBeInTheDocument();
    }
  });

  test("no promete nada de lo que Growth ya no incluye", () => {
    // El sistema de pacientes, la agenda, el panel y los recordatorios salieron
    // de la oferta. Una línea que los nombre vende algo que no se entrega.
    const { container } = render(<Planes />);
    expect(container.textContent).not.toMatch(/sistema de|agenda|panel|recordatorio/i);
  });

  test("la cuota de alta sigue siendo 150 € y 200 €", () => {
    const { container } = render(<Planes />);
    expect(linea(container, "basico", "Cuota de alta").textContent).toContain("150 €");
    expect(linea(container, "avanzado", "Cuota de alta").textContent).toContain("200 €");
  });

  test("cada tarjeta lleva al formulario", () => {
    const { container } = render(<Planes />);
    const botones = container.querySelectorAll('a[href="#empezar"]');
    expect(botones).toHaveLength(2);
  });
});
