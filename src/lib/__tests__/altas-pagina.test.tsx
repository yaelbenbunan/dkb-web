import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const m = vi.hoisted(() => ({ getAltaPorToken: vi.fn() }));
vi.mock("@/lib/altas/db", () => ({ getAltaPorToken: m.getAltaPorToken }));
vi.mock("@/app/(alta)/alta/[token]/acciones", () => ({ enviarAltaAction: vi.fn(), pedirSubidaAction: vi.fn() }));

import AltaClientePage, { metadata } from "@/app/(alta)/alta/[token]/page";

const TOKEN = "B".repeat(43);
const alta = (extra = {}) => ({ id: "x", token: TOKEN, cliente: "Nubosoft", activa: true, respuestas: {}, archivos: [], enviada_en: null, ...extra });

async function pintar() {
  render(await AltaClientePage({ params: Promise.resolve({ token: TOKEN }) }));
}

describe("/alta/[token]", () => {
  beforeEach(() => m.getAltaPorToken.mockReset());

  test("no se indexa ni pasa el token en el Referer", () => {
    expect(metadata.robots).toMatchObject({ index: false });
    expect(metadata.referrer).toBe("no-referrer");
  });

  test("token inexistente o desactivado: el mismo mensaje, sin el formulario", async () => {
    m.getAltaPorToken.mockResolvedValueOnce(null);
    await pintar();
    expect(screen.getByRole("heading", { name: "Este enlace no es válido" })).toBeInTheDocument();
    document.body.innerHTML = "";
    m.getAltaPorToken.mockResolvedValueOnce(alta({ activa: false }));
    await pintar();
    expect(screen.getByRole("heading", { name: "Este enlace no es válido" })).toBeInTheDocument();
    expect(screen.queryByText(/Nubosoft/)).not.toBeInTheDocument();
  });

  test("token activo: bienvenida con el nombre y las 8 secciones", async () => {
    m.getAltaPorToken.mockResolvedValueOnce(alta());
    await pintar();
    expect(screen.getByRole("heading", { level: 1, name: "Bienvenido a Dinkbit, Nubosoft" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(8);
  });
});
