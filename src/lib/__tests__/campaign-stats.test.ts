import { describe, expect, test } from "vitest";
import { hasEngagementTracking, statusesBelow, summarizeRecipientStatuses } from "../campaign-stats";

describe("statusesBelow", () => {
  test("una apertura solo sube desde pendiente, enviado o entregado", () => {
    expect(statusesBelow("opened")).toEqual(["pending", "sent", "delivered"]);
  });

  test("un entregado tardío no baja a quien ya abrió o hizo clic", () => {
    const below = statusesBelow("delivered")!;
    expect(below).not.toContain("opened");
    expect(below).not.toContain("clicked");
  });

  test("rebote y queja se escriben siempre", () => {
    expect(statusesBelow("bounced")).toBeNull();
    expect(statusesBelow("complained")).toBeNull();
  });
});

describe("summarizeRecipientStatuses", () => {
  test("un clic cuenta también como apertura y entrega", () => {
    const s = summarizeRecipientStatuses(["clicked", "opened", "delivered", "delivered"]);
    expect(s.delivered).toBe(4);
    expect(s.opened).toBe(2);
    expect(s.clicked).toBe(1);
    expect(s.openRate).toBe(50);
    expect(s.clickRate).toBe(25);
  });

  test("los fallidos no cuentan como enviados; los rebotes sí", () => {
    const s = summarizeRecipientStatuses(["failed", "bounced", "sent", "delivered"]);
    expect(s.total).toBe(4);
    expect(s.sent).toBe(3);
    expect(s.failed).toBe(1);
    expect(s.bounced).toBe(1);
  });

  test("sin entregas no hay porcentaje", () => {
    const s = summarizeRecipientStatuses(["sent", "failed"]);
    expect(s.openRate).toBeNull();
    expect(s.clickRate).toBeNull();
  });
});

describe("hasEngagementTracking", () => {
  test("las campañas enviadas antes de activar el seguimiento no tienen aperturas", () => {
    expect(hasEngagementTracking("2026-09-16T08:01:32Z")).toBe(false);
    expect(hasEngagementTracking("2026-09-20T08:00:00Z")).toBe(true);
  });
});
