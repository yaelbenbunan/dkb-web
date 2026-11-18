import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const ruta = vi.hoisted(() => ({ actual: "/panel/hoy" }));
vi.mock("next/navigation", () => ({ usePathname: () => ruta.actual }));

import { BarraUbicacion, MenuEspacios } from "@/app/(site)/panel/_componentes/EspaciosNav";

const clientes = [
  { id: "h", slug: "hydrup", nombre: "Hydrup", pausada: false },
  { id: "n", slug: "nubosoft", nombre: "Nubosoft", pausada: true },
];

describe("MenuEspacios", () => {
  beforeEach(() => {
    ruta.actual = "/panel/hoy";
  });

  test("admin: Dinkbit con Altas, cada cliente y Ajustes", () => {
    render(<MenuEspacios clientes={clientes} esAdmin />);
    const menu = screen.getByRole("navigation", { name: "Menú del panel" });
    for (const texto of ["Mi día", "Tareas", "Leads", "WhatsApp", "Captación", "Altas", "Hydrup", "Nubosoft", "Todos los clientes", "Usuarios", "Ajustes de dinkbit"]) {
      expect(within(menu).getByRole("link", { name: new RegExp(texto) })).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: /Leads/ })).toHaveAttribute("href", "/panel/dinkbit/tablero");
    expect(screen.getByRole("link", { name: /Hydrup/ })).toHaveAttribute("href", "/panel/hydrup/ficha");
    expect(screen.getByText("pausada")).toBeInTheDocument();
  });

  test("comercial: los dos espacios, sin Altas ni Ajustes", () => {
    render(<MenuEspacios clientes={clientes} esAdmin={false} />);
    expect(screen.getByRole("link", { name: /Leads/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Hydrup/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Altas/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Usuarios/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Ajustes de dinkbit/ })).not.toBeInTheDocument();
  });

  test("resalta dónde estás: el grupo de dinkbit o la carpeta del cliente", () => {
    ruta.actual = "/panel/dinkbit/prospeccion";
    const { unmount } = render(<MenuEspacios clientes={clientes} esAdmin />);
    expect(screen.getByRole("link", { name: /Captación/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Leads/ })).not.toHaveAttribute("aria-current");
    unmount();

    ruta.actual = "/panel/hydrup/conversaciones";
    render(<MenuEspacios clientes={clientes} esAdmin />);
    expect(screen.getByRole("link", { name: /Hydrup/ })).toHaveAttribute("aria-current", "page");
    // «WhatsApp» del menú es el de dinkbit: no se enciende en un cliente.
    expect(screen.getByRole("link", { name: /^WhatsApp$/ })).not.toHaveAttribute("aria-current");
  });
});

describe("MenuEspacios · clientes anclados", () => {
  test("con anclaje, «Mis clientes»; sin ninguno, cómo anclarlos", () => {
    render(<MenuEspacios clientes={[]} conAnclaje esAdmin />);
    expect(screen.getByText("MIS CLIENTES")).toBeInTheDocument();
    expect(screen.getByText(/Ancla tus clientes desde su ficha/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Todos los clientes" })).toBeInTheDocument();
  });
});

describe("BarraUbicacion", () => {
  test("dice el espacio y la ruta", () => {
    ruta.actual = "/panel/hydrup/tablero";
    render(<BarraUbicacion clientes={clientes} />);
    expect(screen.getByText("CLIENTES")).toBeInTheDocument();
    expect(screen.getByText("Clientes › Hydrup › Leads › Tablero")).toBeInTheDocument();
  });
});
