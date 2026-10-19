import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const m = vi.hoisted(() => ({ enviar: vi.fn(), push: vi.fn() }));
vi.mock("@/lib/proveedores-deportivos-action", () => ({ enviarSolicitudPack: m.enviar }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: m.push }) }));
vi.mock("@/lib/meta-pixel", () => ({ newEventId: () => "ev-1", trackMetaLead: vi.fn() }));
vi.mock("@/lib/chatgpt-pixel", () => ({ trackChatGptLead: vi.fn() }));
vi.mock("@/lib/gtm", () => ({ track: vi.fn(), pushUserData: vi.fn() }));
vi.mock("@/lib/utm", () => ({ appendUtms: vi.fn() }));

import { FormularioPack } from "../FormularioPack";

function rellenarPasoUno() {
  fireEvent.change(screen.getByLabelText(/Nombre y apellidos/i), { target: { value: "Laura Gómez" } });
  fireEvent.change(screen.getByLabelText(/^Empresa/i), { target: { value: "Padel Pro" } });
  fireEvent.change(screen.getByLabelText(/Web o Instagram/i), { target: { value: "@padelpro" } });
  fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: "laura@padelpro.es" } });
  fireEvent.change(screen.getByLabelText(/Teléfono/i), { target: { value: "600112233" } });
}

function rellenarPasoDos() {
  fireEvent.change(screen.getByLabelText(/¿Qué vendes\?/i), { target: { value: "padel" } });
  fireEvent.click(screen.getByLabelText("Gimnasios"));
  fireEvent.change(screen.getByLabelText(/Facturación anual/i), { target: { value: "100k_500k" } });
  fireEvent.click(screen.getByLabelText("Sí"));
  fireEvent.change(screen.getByLabelText(/Presupuesto mensual/i), { target: { value: "500_1500" } });
  fireEvent.click(screen.getByLabelText(/acepto la/i));
}

beforeEach(() => {
  m.enviar.mockReset();
  m.push.mockReset();
});

describe("FormularioPack", () => {
  test("no pasa al paso 2 con el paso 1 incompleto", () => {
    render(<FormularioPack />);
    fireEvent.click(screen.getByRole("button", { name: /Siguiente/i }));
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
    expect(screen.getByText(/Escribe tu nombre y apellidos/i)).toBeInTheDocument();
  });

  test("volver al paso 1 conserva lo escrito y los chips", () => {
    render(<FormularioPack />);
    rellenarPasoUno();
    fireEvent.click(screen.getByRole("button", { name: /Siguiente/i }));
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "2");
    fireEvent.click(screen.getByLabelText("Gimnasios"));
    fireEvent.click(screen.getByRole("button", { name: /Volver/i }));
    expect(screen.getByLabelText(/Nombre y apellidos/i)).toHaveValue("Laura Gómez");
    fireEvent.click(screen.getByRole("button", { name: /Siguiente/i }));
    expect(screen.getByLabelText("Gimnasios")).toBeChecked();
  });

  test("envía una sola vez y lleva a la página de gracias", async () => {
    let resolver!: (v: { ok: true }) => void;
    m.enviar.mockReturnValue(new Promise((r) => (resolver = r)));
    render(<FormularioPack />);
    rellenarPasoUno();
    fireEvent.click(screen.getByRole("button", { name: /Siguiente/i }));
    rellenarPasoDos();
    const enviar = screen.getByRole("button", { name: /ENVIAR SOLICITUD/i });
    fireEvent.submit(enviar.closest("form")!);
    await waitFor(() => expect(screen.getByRole("button", { name: /Enviando/i })).toBeDisabled());
    fireEvent.submit(enviar.closest("form")!);
    resolver({ ok: true });
    await waitFor(() => expect(m.push).toHaveBeenCalledWith("/proveedores-deportivos/gracias"));
    expect(m.enviar).toHaveBeenCalledTimes(1);
  });

  test("si falla, avisa con enlace a WhatsApp", async () => {
    m.enviar.mockResolvedValue({ ok: false, error: "No hemos podido enviar tu solicitud.", whatsapp: "https://wa.me/34657559397" });
    render(<FormularioPack />);
    rellenarPasoUno();
    fireEvent.click(screen.getByRole("button", { name: /Siguiente/i }));
    rellenarPasoDos();
    fireEvent.submit(screen.getByRole("button", { name: /ENVIAR SOLICITUD/i }).closest("form")!);
    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("No hemos podido enviar");
    expect(alerta.querySelector("a")).toHaveAttribute("href", "https://wa.me/34657559397");
  });

  test("si la llamada al servidor revienta (red caída), avisa con WhatsApp y deja reintentar", async () => {
    m.enviar.mockRejectedValueOnce(new Error("Failed to fetch")).mockResolvedValueOnce({ ok: true });
    render(<FormularioPack />);
    rellenarPasoUno();
    fireEvent.click(screen.getByRole("button", { name: /Siguiente/i }));
    rellenarPasoDos();
    const form = screen.getByRole("button", { name: /ENVIAR SOLICITUD/i }).closest("form")!;
    fireEvent.submit(form);
    const alerta = await screen.findByRole("alert");
    expect(alerta.querySelector("a")?.getAttribute("href")).toContain("wa.me");
    fireEvent.submit(form);
    await waitFor(() => expect(m.push).toHaveBeenCalledWith("/proveedores-deportivos/gracias"));
    expect(m.enviar).toHaveBeenCalledTimes(2);
  });

  test("Enter en el paso 1 avanza al paso 2 en vez de enviar", () => {
    render(<FormularioPack />);
    rellenarPasoUno();
    fireEvent.submit(screen.getByLabelText(/Teléfono/i).closest("form")!);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "2");
    expect(m.enviar).not.toHaveBeenCalled();
  });

  test("al pasar al paso 2 el foco va a su primer campo, y al volver, al primero del paso 1", () => {
    render(<FormularioPack />);
    rellenarPasoUno();
    fireEvent.click(screen.getByRole("button", { name: /Siguiente/i }));
    expect(screen.getByLabelText(/¿Qué vendes\?/i)).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: /Volver/i }));
    expect(screen.getByLabelText(/Nombre y apellidos/i)).toHaveFocus();
  });

  test("el paso 2 incompleto no llega al servidor: marca los campos en el formulario", () => {
    render(<FormularioPack />);
    rellenarPasoUno();
    fireEvent.click(screen.getByRole("button", { name: /Siguiente/i }));
    fireEvent.submit(screen.getByRole("button", { name: /ENVIAR SOLICITUD/i }).closest("form")!);
    expect(m.enviar).not.toHaveBeenCalled();
    expect(screen.getByText(/Elige al menos uno/i)).toBeInTheDocument();
    expect(screen.getByText(/aceptar la política de privacidad/i)).toBeInTheDocument();
  });
});
