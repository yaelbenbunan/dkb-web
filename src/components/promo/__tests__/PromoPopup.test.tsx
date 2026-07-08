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

  test("submit is disabled until consent is checked", async () => {
    showPopup();
    vi.useRealTimers();
    await screen.findByRole("dialog");
    const submit = screen.getByRole("button", { name: /quiero la info/i });
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/acepto/i));
    expect(submit).toBeEnabled();
  });

  test("submitting a valid email calls the action and shows success", async () => {
    showPopup();
    vi.useRealTimers();
    await screen.findByRole("dialog");
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: "lead@example.com" } });
    fireEvent.click(screen.getByLabelText(/acepto/i));
    fireEvent.click(screen.getByRole("button", { name: /quiero la info/i }));
    await waitFor(() => expect(subscribeMock).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/revisa tu correo/i)).toBeInTheDocument();
  });
});
