import { describe, expect, test } from "vitest";
import { isLeadEmailable, BLOCKING_EMAIL_STATUSES } from "../lead-emailable";

const base = { email: "a@b.com", consent: true, email_status: null };

describe("isLeadEmailable", () => {
  test("con consentimiento, email y sin incidencias → enviable", () => {
    expect(isLeadEmailable(base)).toBe(true);
    expect(isLeadEmailable({ ...base, email_status: "delivered" })).toBe(true);
    expect(isLeadEmailable({ ...base, email_status: "sent" })).toBe(true);
  });

  test("sin consentimiento explícito no es enviable, ni por null ni por false", () => {
    // null = nunca se preguntó; false = se preguntó y dijo que no. Los dos fuera.
    expect(isLeadEmailable({ ...base, consent: null })).toBe(false);
    expect(isLeadEmailable({ ...base, consent: false })).toBe(false);
  });

  test("sin email no hay a dónde enviar", () => {
    expect(isLeadEmailable({ ...base, email: null })).toBe(false);
    expect(isLeadEmailable({ ...base, email: "   " })).toBe(false);
  });

  test("un rebote o una queja lo dejan fuera para siempre", () => {
    for (const s of BLOCKING_EMAIL_STATUSES) {
      expect(isLeadEmailable({ ...base, email_status: s })).toBe(false);
    }
  });

  test("los tres criterios son necesarios, no basta con uno", () => {
    expect(isLeadEmailable({ email: "a@b.com", consent: null, email_status: null })).toBe(false);
    expect(isLeadEmailable({ email: null, consent: true, email_status: null })).toBe(false);
    expect(isLeadEmailable({ email: "a@b.com", consent: true, email_status: "bounced" })).toBe(false);
  });
});
