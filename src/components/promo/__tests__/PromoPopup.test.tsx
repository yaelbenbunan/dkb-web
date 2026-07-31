import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";

const { subscribeMock } = vi.hoisted(() => ({ subscribeMock: vi.fn() }));
vi.mock("@/lib/promo-subscribe-action", () => ({ subscribePromo: subscribeMock }));
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

import { PromoPopup } from "@/components/promo/PromoPopup";

describe("PromoPopup", () => {
  beforeEach(() => {
    subscribeMock.mockReset().mockResolvedValue({ ok: true });
    localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => { vi.useRealTimers(); cleanup(); });

  function showPopup() {
    render(<PromoPopup />);
    vi.advanceTimersByTime(9000); // pasa el showDelayMs
  }

  test("hacen falta las dos casillas: privacidad y comunicaciones comerciales", async () => {
    showPopup();
    vi.useRealTimers();
    await screen.findByRole("dialog");
    const submit = screen.getByRole("button", { name: /quiero mi 50% de descuento/i });
    expect(submit).toBeDisabled();

    // Solo la política de privacidad no basta: son consentimientos distintos.
    fireEvent.click(screen.getByLabelText(/política de privacidad/i));
    expect(submit).toBeDisabled();

    fireEvent.click(screen.getByLabelText(/comunicaciones comerciales/i));
    expect(submit).toBeEnabled();
  });

  test("submitting a valid name and email calls the action and shows success", async () => {
    showPopup();
    vi.useRealTimers();
    await screen.findByRole("dialog");
    fireEvent.change(screen.getByPlaceholderText(/nombre/i), { target: { value: "Ana" } });
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: "lead@example.com" } });
    // El teléfono es obligatorio en la promo: sin él el navegador bloquea el envío.
    fireEvent.change(screen.getByPlaceholderText(/teléfono/i), { target: { value: "600123456" } });
    fireEvent.click(screen.getByLabelText(/política de privacidad/i));
    fireEvent.click(screen.getByLabelText(/comunicaciones comerciales/i));
    fireEvent.click(screen.getByRole("button", { name: /quiero mi 50% de descuento/i }));
    await waitFor(() => expect(subscribeMock).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/revisa tu correo/i)).toBeInTheDocument();
  });
});
