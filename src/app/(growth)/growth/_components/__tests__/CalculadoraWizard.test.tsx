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
    // El servidor devuelve los datos de entrada ya normalizados: la pantalla
    // de resultado dibuja con ellos el embudo del propio usuario.
    entrada: { inversion: 1500, pacientes: 17, ticket: 400 },
  },
}));
const trackMetaLead = vi.fn();
vi.mock("@/lib/growth-action", () => ({ requestGrowth: (fd: FormData) => requestGrowth(fd) }));
vi.mock("@/lib/gtm", () => ({ track: vi.fn(), pushUserData: vi.fn() }));
vi.mock("@/lib/meta-pixel", () => ({
  newEventId: () => "evt-1",
  trackMetaLead: (eventId: string) => trackMetaLead(eventId),
}));
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
    // Se ancla en el encabezado de la pantalla de resultado y, aparte, en que
    // la cifra calculada aparezca: juntos prueban que se está mostrando el
    // resultado y no cualquier otra pantalla.
    expect(await screen.findByText(/Tu situación hoy/i)).toBeInTheDocument();
    expect(screen.getAllByText(/88,24/).length).toBeGreaterThan(0);

    // El eventId se genera una sola vez y el mismo valor va al FormData que
    // recibe el servidor y a la conversión que se manda al píxel de Meta.
    const enviado = requestGrowth.mock.calls[0][0] as FormData;
    expect(enviado.get("eventId")).toBe("evt-1");
    expect(trackMetaLead).toHaveBeenCalledWith("evt-1");
  });

  test("«Siguiente» está deshabilitado con el campo vacío; omitir funciona igual", async () => {
    const user = userEvent.setup();
    render(<CalculadoraWizard />);

    const siguiente = screen.getByRole("button", { name: /siguiente/i });
    expect(siguiente).toBeDisabled();

    await user.type(screen.getByLabelText(/inviertes al mes/i), "1500");
    expect(siguiente).toBeEnabled();

    // Escribir y borrar deja el campo vacío otra vez: sin validación se
    // registraría como "no invierto todavía" al pulsar Siguiente, que es
    // justo lo que el hallazgo 5 impide.
    await user.clear(screen.getByLabelText(/inviertes al mes/i));
    expect(siguiente).toBeDisabled();

    // La vía de "no lo sé" sigue funcionando igual, campo vacío incluido.
    await user.click(screen.getByRole("button", { name: /no invierto todav/i }));
    expect(screen.getByLabelText(/pacientes nuevos/i)).toBeInTheDocument();
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
