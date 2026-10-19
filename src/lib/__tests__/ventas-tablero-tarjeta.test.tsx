import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/app/(site)/panel/ventas/acciones-leads", () => ({ moverLeadAction: vi.fn() }));

import { Tablero, type TarjetaLead } from "@/app/(site)/panel/ventas/(app)/[slug]/tablero/Tablero";

const lead: TarjetaLead = {
  id: "l1",
  negocio: "Clínica Sol",
  tipo: null,
  ciudad: "Madrid",
  campana: "Proveedores deportivos",
  contacto: "Laura Gómez",
  telefono: "600112233",
  email: "laura@clinicasol.es",
  fase: "nuevo",
  excluido: false,
  proximo_seguimiento: null,
  proximo_seguimiento_hora: null,
  created_at: "2026-10-19T08:00:00Z",
  ultima_nota: null,
  asignada: null,
};

describe("Tablero: tarjeta", () => {
  test("enseña siempre el negocio, la campaña y los datos de contacto, que se pueden pulsar", () => {
    render(<Tablero slug="dinkbit" leads={[lead]} ahora={{ fecha: "2026-10-19", hora: "10:00" }} filtrosLista={{ mias: false, atrasados: false, q: "" }} />);
    expect(screen.getByText("Clínica Sol")).toBeInTheDocument();
    expect(screen.getByText("Proveedores deportivos")).toBeInTheDocument();
    expect(screen.getByText("Laura Gómez")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "600112233" })).toHaveAttribute("href", "tel:600112233");
    expect(screen.getByRole("link", { name: "laura@clinicasol.es" })).toHaveAttribute("href", "mailto:laura@clinicasol.es");
  });
});
