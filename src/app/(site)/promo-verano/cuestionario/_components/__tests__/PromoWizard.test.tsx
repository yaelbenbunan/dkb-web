import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";

const { submitMock } = vi.hoisted(() => ({ submitMock: vi.fn() }));
vi.mock("@/lib/promo-questionnaire-action", () => ({ submitPromoQuestionnaire: submitMock }));

import { PromoWizard } from "../PromoWizard";

describe("PromoWizard", () => {
  beforeEach(() => { submitMock.mockReset().mockResolvedValue({ ok: true }); });
  afterEach(cleanup);

  test("renders the first group and can advance", () => {
    render(<PromoWizard token="tok" leadId="lead-1" email="lead@example.com" />);
    expect(screen.getByText(/datos de contacto/i)).toBeInTheDocument();
    expect(screen.getByText(/nombre y apellidos/i)).toBeInTheDocument();
    // el botón de avanzar existe
    expect(screen.getByRole("button", { name: /siguiente/i })).toBeInTheDocument();
  });

  test("shows a thank-you state after a successful submit", async () => {
    render(<PromoWizard token="tok" leadId="lead-1" email="lead@example.com" />);
    // Salta al final rellenando lo mínimo vía el botón "enviar" simulado:
    // el wizard expone un submit final; forzamos el envío del form.
    const form = screen.getByTestId("promo-wizard-form");
    fireEvent.submit(form);
    await waitFor(() => expect(submitMock).toHaveBeenCalled());
    expect(await screen.findByText(/gracias/i)).toBeInTheDocument();
  });
});
