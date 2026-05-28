import { describe, it, expect } from "vitest";
import {
  buildCopyPrompt,
  buildImagePrompt,
  type PromptInput,
} from "@/lib/preview-prompts";

const baseInput: PromptInput = {
  businessName: "La Tiendita",
  sectorLabel: "Moda",
  businessType: "ecommerce",
  ecommerceKind: "productos",
  offerings: ["camisetas", "sudaderas", "gorras"],
  valueProp: "Hacemos prendas artesanales con materiales sostenibles desde 2010.",
  paletteSlug: "azul-electrico",
  paletteAccent: "#2563eb",
  template: "ecommerce",
};

describe("buildCopyPrompt", () => {
  it("includes the business name, sector, and value prop", () => {
    const p = buildCopyPrompt(baseInput);
    expect(p).toContain("La Tiendita");
    expect(p).toContain("Moda");
    expect(p).toContain("prendas artesanales");
  });

  it("includes each offering", () => {
    const p = buildCopyPrompt(baseInput);
    for (const o of baseInput.offerings) {
      expect(p).toContain(o);
    }
  });

  it("declares the no-invented-data rule", () => {
    const p = buildCopyPrompt(baseInput);
    expect(p.toLowerCase()).toContain("no inventes");
  });

  it("requests Spanish from Spain", () => {
    const p = buildCopyPrompt(baseInput);
    expect(p.toLowerCase()).toMatch(/espa[ñn]a/);
  });
});

describe("buildImagePrompt", () => {
  it("mentions sector and palette accent color", () => {
    const p = buildImagePrompt(baseInput);
    expect(p.toLowerCase()).toContain("moda");
    expect(p.toLowerCase()).toContain("2563eb");
  });

  it("explicitly bans people faces, text, logos", () => {
    const p = buildImagePrompt(baseInput);
    expect(p.toLowerCase()).toContain("no people");
    expect(p.toLowerCase()).toContain("no text");
    expect(p.toLowerCase()).toContain("no logos");
  });

  it("picks portrait for informativa and landscape for ecommerce", () => {
    const informativa = buildImagePrompt({
      ...baseInput,
      businessType: "informativa",
      template: "informativa",
    });
    expect(informativa.toLowerCase()).toContain("portrait");

    const ecommerce = buildImagePrompt(baseInput);
    expect(ecommerce.toLowerCase()).toContain("landscape");
  });
});
