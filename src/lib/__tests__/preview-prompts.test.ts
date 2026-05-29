import { describe, it, expect } from "vitest";
import {
  buildCopyPrompt,
  buildImagePrompt,
  buildSectorInformativaCopyPrompt,
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

describe("buildCopyPrompt — current website grounding", () => {
  it("includes the scraped website summary when provided", () => {
    const p = buildCopyPrompt({
      ...baseInput,
      sourceSummary: "Título: Moda Sostenible | Camisetas de algodón orgánico.",
    });
    expect(p).toContain("WEB ACTUAL");
    expect(p).toContain("algodón orgánico");
  });

  it("omits the website block when no summary is given", () => {
    const p = buildCopyPrompt(baseInput);
    expect(p).not.toContain("WEB ACTUAL");
  });
});

describe("buildSectorInformativaCopyPrompt — sub-specialty coherence", () => {
  const saludInput: PromptInput = {
    businessName: "Fisioterapia Bimo",
    sectorLabel: "Salud",
    businessType: "informativa",
    offerings: ["Fisioterapia deportiva", "Punción seca"],
    valueProp: "Recuperamos lesiones con un plan de trabajo personalizado.",
    paletteSlug: "azul-electrico",
    paletteAccent: "#2563eb",
    template: "informativa",
  };

  it("instructs deriving the exact sub-specialty from the business name", () => {
    const p = buildSectorInformativaCopyPrompt(saludInput);
    expect(p).toContain("SUBESPECIALIDAD");
    expect(p).toContain("Fisioterapia Bimo");
    // The fisioterapia → no-dental example must be present.
    expect(p.toLowerCase()).toContain("fisioterapeuta");
    expect(p.toLowerCase()).toContain("prohibido");
  });

  it("requires a short description for every service (non-restauración)", () => {
    const p = buildSectorInformativaCopyPrompt(saludInput);
    expect(p).toMatch(/blurb[\s\S]*OBLIGATORIO/);
  });

  it("keeps the user's featured dishes for restauración", () => {
    const p = buildSectorInformativaCopyPrompt({
      ...saludInput,
      sectorLabel: "Restauración",
      cuisineLabel: "Italiana",
      featuredDishes: ["Tagliatelle al ragú", "Tiramisú de la casa"],
    });
    expect(p).toContain("Platos destacados");
    expect(p).toContain("Tagliatelle al ragú");
    expect(p).toContain("Tiramisú de la casa");
  });

  it("asks for a priced carta (menu) only for restauración", () => {
    const resto = buildSectorInformativaCopyPrompt({
      ...saludInput,
      sectorLabel: "Restauración",
      cuisineLabel: "Italiana",
    });
    expect(resto).toContain("CARTA");
    expect(resto).toContain("PRECIOS");
    expect(resto).toContain('"menu"');

    const salud = buildSectorInformativaCopyPrompt(saludInput);
    expect(salud).not.toContain('"menu"');
  });

  it("includes the scraped website summary when provided", () => {
    const p = buildSectorInformativaCopyPrompt({
      ...saludInput,
      sourceSummary: "Contenido: especialistas en suelo pélvico.",
    });
    expect(p).toContain("WEB ACTUAL");
    expect(p).toContain("suelo pélvico");
  });
});
