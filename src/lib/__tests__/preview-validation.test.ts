import { describe, it, expect } from "vitest";
import {
  previewLeadSchema,
  previewRatingSchema,
} from "@/lib/preview-validation";

const validLead = {
  businessType: "ecommerce",
  ecommerceKind: "productos",
  businessName: "La Tiendita",
  sector: "moda",
  offerings: ["camisetas", "gorras"],
  palette: "pastel-suave",
  typography: "moderna-sans",
  valueProp:
    "Somos artesanos locales con materiales sostenibles desde 2010, atención personal.",
  name: "Ana López",
  email: "ana@example.com",
  phone: "+34 600 111 222",
  privacy: "on",
  website: "",
  formLoadedAt: Date.now() - 5000,
};

describe("previewLeadSchema", () => {
  it("accepts a valid ecommerce-productos lead", () => {
    expect(previewLeadSchema.safeParse(validLead).success).toBe(true);
  });

  it("accepts informativa without ecommerceKind", () => {
    const r = previewLeadSchema.safeParse({
      ...validLead,
      businessType: "informativa",
      ecommerceKind: undefined,
    });
    expect(r.success).toBe(true);
  });

  it("rejects ecommerce without ecommerceKind", () => {
    const r = previewLeadSchema.safeParse({
      ...validLead,
      ecommerceKind: undefined,
    });
    expect(r.success).toBe(false);
  });

  it("rejects unknown palette", () => {
    const r = previewLeadSchema.safeParse({ ...validLead, palette: "neon" });
    expect(r.success).toBe(false);
  });

  it("rejects unknown typography", () => {
    const r = previewLeadSchema.safeParse({
      ...validLead,
      typography: "comic",
    });
    expect(r.success).toBe(false);
  });

  it("rejects unknown sector", () => {
    const r = previewLeadSchema.safeParse({ ...validLead, sector: "futbol" });
    expect(r.success).toBe(false);
  });

  it("rejects offerings outside 1..6 range", () => {
    expect(
      previewLeadSchema.safeParse({ ...validLead, offerings: [] }).success,
    ).toBe(false);
    expect(
      previewLeadSchema.safeParse({
        ...validLead,
        offerings: ["a", "b", "c", "d", "e", "f", "g"],
      }).success,
    ).toBe(false);
  });

  it("rejects too-short valueProp", () => {
    const r = previewLeadSchema.safeParse({ ...validLead, valueProp: "corto" });
    expect(r.success).toBe(false);
  });

  it("rejects invalid email and short phone", () => {
    expect(
      previewLeadSchema.safeParse({ ...validLead, email: "x" }).success,
    ).toBe(false);
    expect(
      previewLeadSchema.safeParse({ ...validLead, phone: "12" }).success,
    ).toBe(false);
  });

  it("rejects missing privacy", () => {
    const r = previewLeadSchema.safeParse({ ...validLead, privacy: "" });
    expect(r.success).toBe(false);
  });

  it("rejects filled honeypot", () => {
    const r = previewLeadSchema.safeParse({ ...validLead, website: "spam" });
    expect(r.success).toBe(false);
  });

  it("rejects submission faster than 2s", () => {
    const r = previewLeadSchema.safeParse({
      ...validLead,
      formLoadedAt: Date.now() - 500,
    });
    expect(r.success).toBe(false);
  });
});

const validRating = {
  ...validLead,
  leadId: "m7k2-a9f3",
  rating: "up" as const,
  comment: "Me ha gustado mucho.",
};

describe("previewRatingSchema", () => {
  it("accepts a valid up rating with comment", () => {
    expect(previewRatingSchema.safeParse(validRating).success).toBe(true);
  });

  it("accepts down rating without comment", () => {
    const r = previewRatingSchema.safeParse({
      ...validRating,
      rating: "down",
      comment: "",
    });
    expect(r.success).toBe(true);
  });

  it("rejects malformed leadId", () => {
    const r = previewRatingSchema.safeParse({
      ...validRating,
      leadId: "not valid",
    });
    expect(r.success).toBe(false);
  });

  it("rejects unknown rating value", () => {
    const r = previewRatingSchema.safeParse({
      ...validRating,
      rating: "meh",
    });
    expect(r.success).toBe(false);
  });
});
