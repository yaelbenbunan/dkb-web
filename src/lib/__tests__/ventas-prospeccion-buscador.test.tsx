import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

const m = vi.hoisted(() => ({ refresh: vi.fn(), buscarAction: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: m.refresh }) }));
vi.mock("@/app/(site)/panel/ventas/acciones-prospeccion", () => ({
  buscarAction: m.buscarAction,
}));

import { Buscador } from "@/app/(site)/panel/ventas/(app)/[slug]/prospeccion/Buscador";

describe("Buscador de Prospección", () => {
  test("cita Overture (fuentes, licencias y enlace a la atribución) y OpenStreetMap", () => {
    render(<Buscador slug="dinkbit" onAviso={() => {}} />);
    expect(screen.getByRole("link", { name: "Overture Maps Foundation" })).toHaveAttribute("href", "https://overturemaps.org");
    expect(screen.getByRole("link", { name: "atribución completa" })).toHaveAttribute("href", "https://docs.overturemaps.org/attribution/");
    expect(screen.getByText(/CDLA Permissive 2\.0, Apache 2\.0 \(Foursquare\) y CC0 1\.0/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "colaboradores de OpenStreetMap" })).toHaveAttribute("href", "https://www.openstreetmap.org/copyright");
  });

  test("se busca por municipio o provincia", () => {
    render(<Buscador slug="dinkbit" onAviso={() => {}} />);
    expect(screen.getByLabelText("Municipio o provincia")).toBeInTheDocument();
  });

  test("busca, enseña el resultado y no se pone a leer webs en busca de emails", async () => {
    const onAviso = vi.fn();
    m.buscarAction.mockResolvedValue({ ok: true, searchId: "s1", mensaje: "200 empresas nuevas" });
    render(<Buscador slug="dinkbit" onAviso={onAviso} />);
    fireEvent.change(screen.getByLabelText("Municipio o provincia"), { target: { value: "Madrid" } });
    fireEvent.submit(screen.getByLabelText("Municipio o provincia").closest("form")!);
    await waitFor(() => expect(onAviso).toHaveBeenCalledWith({ ok: true, texto: "200 empresas nuevas" }));
    expect(m.refresh).toHaveBeenCalled();
    expect(screen.queryByText(/Buscando emails/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Buscar" })).toBeEnabled();
  });
});
