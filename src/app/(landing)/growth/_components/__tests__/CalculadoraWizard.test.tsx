import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

const requestGrowth = vi.fn(async (_fd: FormData) => ({
  ok: true as const,
  resultado: {
    rama: "A" as const,
    costePorPaciente: 88.24,
    generado: 6800,
    retorno: 4.53,
    sinPacientes: false,
  },
}));
vi.mock("@/lib/growth-action", () => ({ requestGrowth: (fd: FormData) => requestGrowth(fd) }));
vi.mock("@/lib/gtm", () => ({ track: vi.fn(), pushUserData: vi.fn() }));
vi.mock("@/lib/meta-pixel", () => ({ newEventId: () => "evt-1", trackMetaLead: vi.fn() }));
vi.mock("@/lib/utm", () => ({ appendUtms: vi.fn() }));

import { CalculadoraWizard } from "../CalculadoraWizard";

describe("CalculadoraWizard", () => {
  beforeEach(() => vi.clearAllMocks());

  test("el resultado NO se muestra antes del paso de contacto", async () => {
    const user = userEvent.setup();
    render(<CalculadoraWizard />);

    await user.type(screen.getByLabelText(/inviertes al mes/i), "1500");
    await user.click(screen.getByRole("button", { name: /siguiente/i }));
    await user.type(screen.getByLabelText(/pacientes nuevos/i), "17");
    await user.click(screen.getByRole("button", { name: /siguiente/i }));
    await user.type(screen.getByLabelText(/ticket medio/i), "400");
    await user.click(screen.getByRole("button", { name: /siguiente/i }));

    // Estamos en el paso de contacto y la cifra no puede estar en pantalla.
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.queryByText(/88,24/)).not.toBeInTheDocument();
    expect(requestGrowth).not.toHaveBeenCalled();
  });

  test("«no lo sé» avanza sin escribir ningún número", async () => {
    const user = userEvent.setup();
    render(<CalculadoraWizard />);

    await user.click(screen.getByRole("button", { name: /no invierto todav/i }));
    expect(screen.getByLabelText(/pacientes nuevos/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /no lo sé/i }));
    expect(screen.getByLabelText(/ticket medio/i)).toBeInTheDocument();
  });

  test("tras enviar el contacto se muestra el resultado", async () => {
    const user = userEvent.setup();
    render(<CalculadoraWizard />);

    await user.type(screen.getByLabelText(/inviertes al mes/i), "1500");
    await user.click(screen.getByRole("button", { name: /siguiente/i }));
    await user.type(screen.getByLabelText(/pacientes nuevos/i), "17");
    await user.click(screen.getByRole("button", { name: /siguiente/i }));
    await user.click(screen.getByRole("button", { name: /prefiero no decirlo/i }));

    await user.type(screen.getByLabelText(/nombre/i), "Ana Ruiz");
    await user.type(screen.getByLabelText(/email/i), "ana@clinica.com");
    await user.type(screen.getByLabelText(/tel/i), "600111222");
    await user.click(screen.getByLabelText(/acepto/i));
    await user.click(screen.getByRole("button", { name: /ver mi resultado/i }));

    expect(requestGrowth).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/88,24/)).toBeInTheDocument();
  });

  test("el honeypot existe y está oculto", () => {
    const { container } = render(<CalculadoraWizard />);
    const honeypot = container.querySelector('input[name="website"]');
    expect(honeypot).not.toBeNull();
    expect(honeypot).not.toBeVisible();
  });

  test("el valor del honeypot llega a la server action", async () => {
    const user = userEvent.setup();
    const { container } = render(<CalculadoraWizard />);
    const honeypot = container.querySelector('input[name="website"]') as HTMLInputElement;

    // Simula el bot que rellena el campo oculto. Lo que importa aquí no es que
    // el servidor lo rechace (eso lo cubre growth-action.test.ts), sino que el
    // valor le llegue: es lo único que la copia manual al FormData garantiza.
    fireEvent.change(honeypot, { target: { value: "http://spam.example" } });

    await user.type(screen.getByLabelText(/inviertes al mes/i), "1500");
    await user.click(screen.getByRole("button", { name: /siguiente/i }));
    await user.type(screen.getByLabelText(/pacientes nuevos/i), "17");
    await user.click(screen.getByRole("button", { name: /siguiente/i }));
    await user.click(screen.getByRole("button", { name: /prefiero no decirlo/i }));

    await user.type(screen.getByLabelText(/nombre/i), "Ana Ruiz");
    await user.type(screen.getByLabelText(/email/i), "ana@clinica.com");
    await user.type(screen.getByLabelText(/tel/i), "600111222");
    await user.click(screen.getByLabelText(/acepto/i));
    await user.click(screen.getByRole("button", { name: /ver mi resultado/i }));

    const enviado = requestGrowth.mock.calls[0][0];
    expect(enviado.get("website")).toBe("http://spam.example");
  });
});
