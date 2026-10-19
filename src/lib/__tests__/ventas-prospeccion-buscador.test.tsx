import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

const m = vi.hoisted(() => ({ refresh: vi.fn(), buscarAction: vi.fn(), enriquecerTandaAction: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: m.refresh }) }));
vi.mock("@/app/(site)/panel/ventas/acciones-prospeccion", () => ({
  buscarAction: m.buscarAction,
  enriquecerTandaAction: m.enriquecerTandaAction,
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

  test("las empresas encontradas se enseñan antes de revisar sus webs", async () => {
    let soltarTanda!: (v: { procesados: number; restantes: number }) => void;
    m.buscarAction.mockResolvedValue({ ok: true, searchId: "s1", mensaje: "200 empresas nuevas" });
    m.enriquecerTandaAction.mockReturnValue(new Promise((r) => (soltarTanda = r)));
    render(<Buscador slug="dinkbit" pendientes={[]} onAviso={() => {}} />);
    fireEvent.change(screen.getByLabelText("Municipio o provincia"), { target: { value: "Madrid" } });
    fireEvent.submit(screen.getByLabelText("Municipio o provincia").closest("form")!);
    await waitFor(() => expect(m.enriquecerTandaAction).toHaveBeenCalled());
    // La revisión de webs aún no ha terminado y la lista ya se ha recargado.
    expect(m.refresh).toHaveBeenCalled();
    soltarTanda({ procesados: 10, restantes: 0 });
  });
});
