import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const acciones = vi.hoisted(() => ({ moverLeadAction: vi.fn(), eliminarLeadTableroAction: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }) }));
vi.mock("@/app/(site)/panel/ventas/acciones-leads", () => acciones);

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

describe("Tablero: eliminar desde la tarjeta", () => {
  const ahora = { fecha: "2026-10-19", hora: "10:00" };
  const filtros = { mias: false, atrasados: false, q: "" };
  const abrirMenu = () => fireEvent.click(screen.getByRole("button", { name: "Más acciones de Clínica Sol" }));

  beforeEach(() => acciones.eliminarLeadTableroAction.mockReset());

  test("sin permiso no aparece la opción", () => {
    render(<Tablero slug="dinkbit" leads={[lead]} ahora={ahora} filtrosLista={filtros} />);
    abrirMenu();
    expect(screen.queryByRole("menuitem", { name: "Eliminar lead…" })).not.toBeInTheDocument();
  });

  test("pide confirmación y cancelar no borra", () => {
    render(<Tablero slug="dinkbit" leads={[lead]} ahora={ahora} filtrosLista={filtros} puedeEliminar />);
    abrirMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Eliminar lead…" }));
    expect(screen.getByRole("alertdialog", { name: "¿Eliminar «Clínica Sol»?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(acciones.eliminarLeadTableroAction).not.toHaveBeenCalled();
    expect(screen.getByText("Clínica Sol")).toBeInTheDocument();
  });

  test("al confirmar, borra y la tarjeta desaparece", async () => {
    acciones.eliminarLeadTableroAction.mockResolvedValue({ ok: true });
    render(<Tablero slug="dinkbit" leads={[lead]} ahora={ahora} filtrosLista={filtros} puedeEliminar />);
    abrirMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Eliminar lead…" }));
    fireEvent.click(screen.getByRole("button", { name: "Eliminar definitivamente" }));
    expect(acciones.eliminarLeadTableroAction).toHaveBeenCalledWith("dinkbit", "l1");
    await waitFor(() => expect(screen.queryByRole("article")).not.toBeInTheDocument());
    expect(await screen.findByText("«Clínica Sol» eliminado")).toBeInTheDocument();
  });

  test("si falla, la tarjeta vuelve y se avisa", async () => {
    acciones.eliminarLeadTableroAction.mockResolvedValue({ ok: false, error: "Solo un admin puede eliminar leads." });
    render(<Tablero slug="dinkbit" leads={[lead]} ahora={ahora} filtrosLista={filtros} puedeEliminar />);
    abrirMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Eliminar lead…" }));
    fireEvent.click(screen.getByRole("button", { name: "Eliminar definitivamente" }));
    expect(await screen.findByText("«Clínica Sol» no se ha eliminado: Solo un admin puede eliminar leads.")).toBeInTheDocument();
    expect(screen.getByRole("article")).toBeInTheDocument();
  });
});
