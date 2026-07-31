import { describe, expect, test } from "vitest";
import { PROMO, isPromoActive, promoDeadlineLabel, PROMO_PRICES, promoReservationDeadline, promoReservationLabel } from "../promo-config";

describe("promo-config", () => {
  const deadline = Date.parse(PROMO.deadlineISO);

  test("promo is active before the deadline and inactive after", () => {
    expect(isPromoActive(deadline - 1000)).toBe(true);
    expect(isPromoActive(deadline + 1000)).toBe(false);
  });

  test("campaign label is the single reporting tag", () => {
    expect(PROMO.campaign).toBe("promo-verano-2026");
    expect(PROMO.mailchimpTag).toBe("promo-verano-2026");
  });

  test("deadline label is a human Spanish date", () => {
    expect(promoDeadlineLabel()).toContain("agosto");
    expect(promoDeadlineLabel()).toContain("2026");
  });
});

describe("PROMO_PRICES", () => {
  test("son tres soluciones, sin agrupar por tipología", () => {
    expect(PROMO_PRICES).toHaveLength(3);
    expect(PROMO_PRICES.map((r) => r.label)).toEqual([
      "One page",
      "Sitio web",
      "Ecommerce",
    ]);
  });

  test("cada precio es exactamente la mitad del anterior (el titular anuncia -50%)", () => {
    const num = (s: string) => Number(s.replace(/[.€]/g, ""));
    for (const r of PROMO_PRICES) {
      expect(num(r.now)).toBe(num(r.before) / 2);
    }
  });
});

describe("promoReservationDeadline", () => {
  const day = 24 * 60 * 60 * 1000;

  test("reserva el precio 5 días desde el envío", () => {
    const sent = Date.parse("2026-07-01T10:00:00+02:00");
    expect(promoReservationDeadline(sent)).toBe(sent + 5 * day);
  });

  test("nunca pasa del fin de la campaña: no se promete un precio ya caducado", () => {
    const sent = Date.parse(PROMO.deadlineISO) - 2 * day;
    expect(promoReservationDeadline(sent)).toBe(Date.parse(PROMO.deadlineISO));
  });

  test("la etiqueta incluye el día y el mes en español", () => {
    const label = promoReservationLabel(Date.parse("2026-07-01T10:00:00+02:00"));
    expect(label).toContain("6");
    expect(label).toContain("julio");
  });
});
