import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

const m = vi.hoisted(() => ({ getAltaPorId: vi.fn(), firmarDescargas: vi.fn(), requireUsuaria: vi.fn() }));
vi.mock("@/lib/altas/db", () => ({ getAltaPorId: m.getAltaPorId, firmarDescargas: m.firmarDescargas }));
vi.mock("@/lib/ventas/auth", () => ({ requireUsuaria: m.requireUsuaria }));
vi.mock("@/app/(site)/panel/ventas/acciones-altas", () => ({ setAltaActivaAction: vi.fn(), crearAltaAction: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));

import AltaPage from "@/app/(site)/panel/ventas/(app)/altas/[id]/page";

describe("panel: vista de un alta", () => {
  test("exige admin y solo enlaza URLs http(s); lo demás va como texto", async () => {
    m.requireUsuaria.mockResolvedValue({ id: "u", rol: "admin", activa: true });
    m.firmarDescargas.mockResolvedValue(new Map());
    m.getAltaPorId.mockResolvedValue({
      id: "11111111-2222-4333-8444-555555555555",
      token: "A".repeat(43),
      cliente: "Nubosoft",
      activa: true,
      respuestas: { web: "https://nubosoft.es", privacidad_url: "javascript:alert(1)", fotos_enlace: "//evil.example" },
      archivos: [],
      enviada_en: "2026-10-22T10:00:00Z",
      created_at: "2026-10-22T09:00:00Z",
      creada_por: null,
    });
    render(await AltaPage({ params: Promise.resolve({ id: "11111111-2222-4333-8444-555555555555" }) }));
    expect(m.requireUsuaria).toHaveBeenCalledWith("admin");
    expect(screen.getByRole("link", { name: "https://nubosoft.es" })).toHaveAttribute("href", "https://nubosoft.es");
    expect(screen.getByText("javascript:alert(1)").closest("a")).toBeNull();
    expect(screen.getByText("//evil.example").closest("a")).toBeNull();
  });
});
