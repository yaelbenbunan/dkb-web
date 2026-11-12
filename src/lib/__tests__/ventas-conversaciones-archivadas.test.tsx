import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/(site)/panel/ventas/(app)/[slug]/conversaciones/acciones", () => ({ responder: vi.fn() }));

import { Conversaciones, type TarjetaConversacion } from "@/app/(site)/panel/ventas/(app)/[slug]/conversaciones/Conversaciones";

const conv: TarjetaConversacion = {
  id: "c1",
  nombre: "Prado (620298798)",
  extracto: "Hola",
  etiquetaVentana: "Cerrada, hace falta plantilla",
  ultimoMensajeAt: "2026-11-10T10:00:00Z",
  esperaRespuesta: false,
};

describe("Conversaciones · bandeja y archivadas", () => {
  test("enseña las dos pestañas con su total y marca la activa", () => {
    render(<Conversaciones slug="dinkbit" conversaciones={[]} hilo={null} conFicha totales={{ bandeja: 2, archivadas: 9 }} />);
    expect(screen.getByRole("link", { name: "Bandeja (2)" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Archivadas (9)" })).toHaveAttribute("href", "/panel/ventas/dinkbit/conversaciones?vista=archivadas");
  });

  test("en Archivadas, abrir una conversación no te saca de la pestaña", () => {
    render(<Conversaciones slug="dinkbit" conversaciones={[conv]} hilo={null} conFicha vista="archivadas" totales={{ bandeja: 0, archivadas: 1 }} />);
    expect(screen.getByRole("link", { name: /Prado/ })).toHaveAttribute("href", "/panel/ventas/dinkbit/conversaciones?vista=archivadas&c=c1");
    expect(screen.getByRole("link", { name: "Archivadas (1)" })).toHaveAttribute("aria-current", "page");
  });

  test("bandeja vacía explica dónde están las cerradas", () => {
    render(<Conversaciones slug="dinkbit" conversaciones={[]} hilo={null} conFicha totales={{ bandeja: 0, archivadas: 3 }} />);
    expect(screen.getByText(/Las de ventana cerrada están en Archivadas/)).toBeInTheDocument();
  });
});
