import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/(site)/panel/ventas/acciones-prospeccion", () => ({
  buscarAction: vi.fn(),
  enriquecerTandaAction: vi.fn(),
}));

import { Buscador } from "@/app/(site)/panel/ventas/(app)/[slug]/prospeccion/Buscador";

describe("Buscador de Prospección", () => {
  test("cita Overture (fuentes, licencias y enlace a la atribución) y OpenStreetMap", () => {
    render(<Buscador slug="dinkbit" pendientes={[]} onAviso={() => {}} />);
    expect(screen.getByRole("link", { name: "Overture Maps Foundation" })).toHaveAttribute("href", "https://overturemaps.org");
    expect(screen.getByRole("link", { name: "atribución completa" })).toHaveAttribute("href", "https://docs.overturemaps.org/attribution/");
    expect(screen.getByText(/CDLA Permissive 2\.0, Apache 2\.0 \(Foursquare\) y CC0 1\.0/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "colaboradores de OpenStreetMap" })).toHaveAttribute("href", "https://www.openstreetmap.org/copyright");
  });

  test("se busca por municipio o provincia", () => {
    render(<Buscador slug="dinkbit" pendientes={[]} onAviso={() => {}} />);
    expect(screen.getByLabelText("Municipio o provincia")).toBeInTheDocument();
  });
});
