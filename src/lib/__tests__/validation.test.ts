import { describe, it, expect } from "vitest";
import { contactSchema } from "@/lib/validation";

const validBase = {
  name: "María Pérez",
  email: "maria@example.com",
  phone: "+34 600 000 000",
  service: "Desarrollo web",
  source: "Google",
  message: "Hola, quiero más info sobre vuestros servicios.",
  privacy: "on",
  website: "",
  formLoadedAt: Date.now() - 5000,
};

describe("contactSchema", () => {
  it("accepts valid input", () => {
    expect(contactSchema.safeParse(validBase).success).toBe(true);
  });

  it("rejects empty name", () => {
    const r = contactSchema.safeParse({ ...validBase, name: "" });
    expect(r.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const r = contactSchema.safeParse({ ...validBase, email: "not-an-email" });
    expect(r.success).toBe(false);
  });

  it("rejects too-short phone", () => {
    const r = contactSchema.safeParse({ ...validBase, phone: "12" });
    expect(r.success).toBe(false);
  });

  it("rejects missing service", () => {
    const r = contactSchema.safeParse({ ...validBase, service: "" });
    expect(r.success).toBe(false);
  });

  it("rejects missing source", () => {
    const r = contactSchema.safeParse({ ...validBase, source: "" });
    expect(r.success).toBe(false);
  });

  it("rejects too-short message", () => {
    const r = contactSchema.safeParse({ ...validBase, message: "hi" });
    expect(r.success).toBe(false);
  });

  it("rejects when privacy is not accepted", () => {
    const r = contactSchema.safeParse({ ...validBase, privacy: "" });
    expect(r.success).toBe(false);
  });

  it("rejects when honeypot is filled", () => {
    const r = contactSchema.safeParse({ ...validBase, website: "spammer" });
    expect(r.success).toBe(false);
  });

  it("rejects submissions faster than 2s", () => {
    const r = contactSchema.safeParse({
      ...validBase,
      formLoadedAt: Date.now() - 500,
    });
    expect(r.success).toBe(false);
  });
});
