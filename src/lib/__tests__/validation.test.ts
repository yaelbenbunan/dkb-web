import { describe, it, expect } from "vitest";
import { contactSchema } from "@/lib/validation";

describe("contactSchema", () => {
  it("accepts valid input", () => {
    const ok = contactSchema.safeParse({
      name: "María Pérez",
      email: "maria@example.com",
      company: "Acme",
      message: "Hola, quiero más info.",
      website: "",
      formLoadedAt: Date.now() - 5000,
    });
    expect(ok.success).toBe(true);
  });

  it("rejects empty name", () => {
    const r = contactSchema.safeParse({
      name: "",
      email: "a@b.com",
      message: "hola hola hola hola",
      website: "",
      formLoadedAt: Date.now() - 5000,
    });
    expect(r.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const r = contactSchema.safeParse({
      name: "x",
      email: "not-an-email",
      message: "hola hola hola hola",
      website: "",
      formLoadedAt: Date.now() - 5000,
    });
    expect(r.success).toBe(false);
  });

  it("rejects too-short message", () => {
    const r = contactSchema.safeParse({
      name: "x",
      email: "a@b.com",
      message: "hi",
      website: "",
      formLoadedAt: Date.now() - 5000,
    });
    expect(r.success).toBe(false);
  });

  it("rejects when honeypot is filled", () => {
    const r = contactSchema.safeParse({
      name: "x",
      email: "a@b.com",
      message: "hola hola hola hola",
      website: "spammer",
      formLoadedAt: Date.now() - 5000,
    });
    expect(r.success).toBe(false);
  });

  it("rejects submissions faster than 2s", () => {
    const r = contactSchema.safeParse({
      name: "x",
      email: "a@b.com",
      message: "hola hola hola hola",
      website: "",
      formLoadedAt: Date.now() - 500,
    });
    expect(r.success).toBe(false);
  });
});
