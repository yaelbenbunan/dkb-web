import { describe, it, expect } from "vitest";
import {
  previewLeadSchema,
  previewRatingSchema,
  copyResponseSchema,
  previewGenerateInputSchema,
  isValidContactPhone,
} from "@/lib/preview-validation";

describe("isValidContactPhone", () => {
  it("accepts real-looking numbers", () => {
    for (const p of [
      "+34 600 111 222",
      "612 458 903",
      "+34 911 234 587",
      "0034 622 814 590",
      "+44 7700 924156",
    ]) {
      expect(isValidContactPhone(p), p).toBe(true);
    }
  });

  it("rejects fakes (repeated, sequential, too few digits, bad prefix)", () => {
    for (const p of [
      "+3400000000", // muchos ceros / pocos dígitos distintos
      "000000000",
      "111111111",
      "600000000", // 0000+ seguidos
      "123456789", // secuencial
      "987654321", // secuencial inverso
      "+34 612 345 678", // contiene 12345678 secuencial
      "600600600", // pocos dígitos distintos
      "123456", // demasiado corto
      "012345678", // empieza por 0 (no válido en ES)
      "512345678", // empieza por 5 (no válido en ES)
    ]) {
      expect(isValidContactPhone(p), p).toBe(false);
    }
  });
});

const validLead = {
  businessType: "ecommerce",
  ecommerceKind: "productos",
  businessName: "La Tiendita",
  sector: "moda",
  offerings: ["camisetas", "gorras"],
  palette: "azul-electrico",
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

  it("accepts a valueProp up to 800 chars and rejects beyond", () => {
    expect(
      previewLeadSchema.safeParse({ ...validLead, valueProp: "a".repeat(800) })
        .success,
    ).toBe(true);
    expect(
      previewLeadSchema.safeParse({ ...validLead, valueProp: "a".repeat(801) })
        .success,
    ).toBe(false);
  });

  it("accepts an optional currentWebsite and featuredDishes", () => {
    const r = previewLeadSchema.safeParse({
      ...validLead,
      currentWebsite: "https://miweb.com",
      featuredDishes: ["Paella", "Tarta de queso"],
    });
    expect(r.success).toBe(true);
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

const validCopyResponse = {
  heroHeadline: "Tu negocio, en su mejor versión",
  heroTagline: "Diseñamos webs que enamoran y venden desde el primer clic.",
  ctaText: "Empezar ahora",
  sectionTitle: "Lo que hacemos",
  offerings: [
    { name: "Asesoría", blurb: "Te ayudamos a definir la estrategia digital correcta." },
  ],
};

describe("copyResponseSchema", () => {
  it("accepts a valid response", () => {
    expect(copyResponseSchema.safeParse(validCopyResponse).success).toBe(true);
  });

  it("rejects too-short headline", () => {
    const r = copyResponseSchema.safeParse({
      ...validCopyResponse,
      heroHeadline: "Hi",
    });
    expect(r.success).toBe(false);
  });

  it("rejects empty offerings", () => {
    const r = copyResponseSchema.safeParse({
      ...validCopyResponse,
      offerings: [],
    });
    expect(r.success).toBe(false);
  });

  it("rejects more than 6 offerings", () => {
    const r = copyResponseSchema.safeParse({
      ...validCopyResponse,
      offerings: Array.from({ length: 7 }, (_, i) => ({
        name: `n${i}`,
        blurb: "Una descripción larga de al menos 20 chars.",
      })),
    });
    expect(r.success).toBe(false);
  });
});

const validGenerateInput = {
  businessType: "ecommerce" as const,
  ecommerceKind: "productos" as const,
  businessName: "La Tiendita",
  sector: "moda",
  offerings: ["camisetas", "gorras"],
  palette: "azul-electrico",
  typography: "moderna-sans",
  valueProp:
    "Hacemos prendas artesanales con materiales sostenibles desde 2010.",
};

describe("previewGenerateInputSchema", () => {
  it("accepts valid input", () => {
    expect(previewGenerateInputSchema.safeParse(validGenerateInput).success).toBe(
      true,
    );
  });

  it("rejects unknown sector", () => {
    const r = previewGenerateInputSchema.safeParse({
      ...validGenerateInput,
      sector: "ufo",
    });
    expect(r.success).toBe(false);
  });

  it("rejects too-short valueProp", () => {
    const r = previewGenerateInputSchema.safeParse({
      ...validGenerateInput,
      valueProp: "corto",
    });
    expect(r.success).toBe(false);
  });
});
