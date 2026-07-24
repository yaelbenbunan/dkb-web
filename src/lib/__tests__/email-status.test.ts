import { describe, expect, test } from "vitest";
import { emailStatusLabel, EMAIL_STATUS_COLORS } from "../email-status";

describe("email-status", () => {
  test("labels por estado", () => {
    expect(emailStatusLabel("sent")).toBe("Enviado");
    expect(emailStatusLabel("delivered")).toBe("Entregado");
    expect(emailStatusLabel("bounced")).toBe("Rebotado");
    expect(emailStatusLabel("complained")).toBe("Spam");
  });
  test("null / desconocido → guion", () => {
    expect(emailStatusLabel(null)).toBe("—");
    expect(emailStatusLabel("otro")).toBe("—");
  });
  test("colores definidos para entregado y rebotado", () => {
    expect(EMAIL_STATUS_COLORS.delivered).toBeTruthy();
    expect(EMAIL_STATUS_COLORS.bounced).toBeTruthy();
  });
});
