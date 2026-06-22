import { describe, expect, test } from "vitest";
import {
  callRequestLead,
  contactLead,
  homeHeroLead,
  kitDigitalLead,
  marketingLandingLead,
} from "../web-lead-origin";

// Every web form that captures a lead must land in the CRM with the conversion
// origin recorded in one of the fields (channel / campaign / notes). These
// builders are the single source of truth for that mapping.

describe("homeHeroLead", () => {
  test("maps contact fields and records the Home Hero origin", () => {
    const row = homeHeroLead({
      name: "Rocío",
      email: "rocio@example.com",
      phone: "637284836",
      service: "Ecommerce",
    });
    expect(row.name).toBe("Rocío");
    expect(row.email).toBe("rocio@example.com");
    expect(row.phone).toBe("637284836");
    expect(row.channel).toBe("Web");
    expect(row.notes).toContain("Home (Hero)");
    expect(row.notes).toContain("Ecommerce");
  });
});

describe("marketingLandingLead", () => {
  test("attributes landing conversions to google ads / Pmax", () => {
    const row = marketingLandingLead({
      name: "Esther",
      phone: "717117321",
      email: "esther@example.com",
      businessType: "Otro sector",
      budget: "Menos de 500€",
      origin: "Landing Negocios locales",
    });
    expect(row.channel).toBe("google ads");
    expect(row.campaign).toBe("Pmax");
    expect(row.notes).toContain("Landing Negocios locales");
    expect(row.notes).toContain("Otro sector");
    expect(row.notes).toContain("Menos de 500€");
    expect(row.email).toBe("esther@example.com");
  });

  test("tolerates a missing (optional) email", () => {
    const row = marketingLandingLead({
      name: "Esther",
      phone: "717117321",
      businessType: "Otro sector",
      budget: "Menos de 500€",
      origin: "Landing Clínicas",
    });
    expect(row.email).toBeNull();
  });
});

describe("callRequestLead", () => {
  test("records the service-page call CTA origin", () => {
    const row = callRequestLead({
      name: "Ana",
      phone: "600000000",
      service: "Ecommerce",
    });
    expect(row.channel).toBe("Web");
    expect(row.email).toBeNull();
    expect(row.notes).toContain("llamada");
    expect(row.notes).toContain("Ecommerce");
  });
});

describe("contactLead", () => {
  test("records the contact-form origin and how they found us", () => {
    const row = contactLead({
      name: "Luis",
      email: "luis@example.com",
      phone: "611111111",
      service: "Plataformas",
      source: "Google",
    });
    expect(row.channel).toBe("Web");
    expect(row.notes).toContain("contacto");
    expect(row.notes).toContain("Plataformas");
    expect(row.notes).toContain("Google");
  });
});

describe("kitDigitalLead", () => {
  test("records the kit-digital origin with model and bono, no sensitive PII", () => {
    const row = kitDigitalLead({
      name: "Marta",
      email: "marta@example.com",
      phone: "622222222",
      device: "Portátil X",
      bono: "BONO-123",
      nif: "12345678Z",
      address: "Calle Falsa 123",
    });
    expect(row.campaign).toBe("Kit Digital");
    expect(row.notes).toContain("kit-digital");
    expect(row.notes).toContain("Portátil X");
    expect(row.notes).toContain("BONO-123");
    // NIF / address are fulfillment PII — they belong in the email, not the CRM notes.
    expect(row.notes).not.toContain("12345678Z");
    expect(row.notes).not.toContain("Calle Falsa 123");
  });
});
