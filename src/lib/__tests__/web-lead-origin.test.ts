import { describe, expect, test } from "vitest";
import {
  attribution,
  callRequestLead,
  contactLead,
  homeHeroLead,
  kitDigital2026Lead,
  kitDigitalLead,
  marketingLandingLead,
  promoVeranoLead,
} from "../web-lead-origin";

describe("attribution (UTMs → canal/campaña)", () => {
  const def = { channel: "Web", campaign: null };
  test("without UTMs keeps the form default", () => {
    expect(attribution(undefined, def)).toEqual(def);
    expect(attribution({ utmSource: "" }, def)).toEqual(def);
  });
  test("maps google sources to google ads and uses utm_campaign", () => {
    expect(attribution({ utmSource: "google", utmCampaign: "search" }, def)).toEqual({
      channel: "google ads",
      campaign: "search",
    });
    expect(attribution({ utmSource: "google-ads" }, def).channel).toBe("google ads");
  });
  test("maps meta sources to Meta", () => {
    expect(attribution({ utmSource: "facebook", utmCampaign: "leads" }, def)).toEqual({
      channel: "Meta",
      campaign: "leads",
    });
  });
  test("falls back to the default campaign when utm_campaign is absent", () => {
    expect(attribution({ utmSource: "google" }, { channel: "Web", campaign: "Kit Digital" })).toEqual({
      channel: "google ads",
      campaign: "Kit Digital",
    });
  });
});

describe("builders honour UTM attribution", () => {
  test("call request from a Google Ads search click", () => {
    const row = callRequestLead(
      { name: "Alexander", phone: "+593988121671", service: "Desarrollo web" },
      { utmSource: "google", utmCampaign: "search" },
    );
    expect(row.channel).toBe("google ads");
    expect(row.campaign).toBe("search");
    expect(row.notes).toContain("Desarrollo web");
  });
});

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

describe("kitDigital2026Lead", () => {
  test("pyme: default campaign, business_type column, services and sectors in notes", () => {
    const row = kitDigital2026Lead({
      name: "Nuria",
      email: "nuria@example.com",
      phone: "633333333",
      services: ["Web", "SEO"],
      businessType: "pyme",
      employees: "3-9",
      sectors: ["Hostelería/restauración", "Comercio/retail"],
    });
    expect(row.channel).toBe("Web");
    expect(row.campaign).toBe("Kit Digital 2026");
    expect(row.businessType).toBe("Pyme");
    // sector column carries the multi-select union for panel filtering.
    expect(row.sector).toBe("Hostelería/restauración, Comercio/retail");
    expect(row.notes).toContain("kit-digital-2026");
    expect(row.notes).toContain("Web, SEO");
    expect(row.notes).toContain("3-9");
    expect(row.notes).toContain("Hostelería/restauración");
  });

  test("autónomo: records seniority instead of employees", () => {
    const row = kitDigital2026Lead({
      name: "Ismael",
      email: "ismael@example.com",
      phone: "644444444",
      services: ["Redes sociales"],
      businessType: "autonomo",
      seniority: "más de 6 meses",
      sectors: [],
    });
    expect(row.businessType).toBe("Autónomo");
    // No sectors selected → sector column stays null.
    expect(row.sector).toBeNull();
    expect(row.notes).toContain("más de 6 meses");
    expect(row.notes).toContain("Redes sociales");
  });

  test("ad traffic sets the channel from UTMs but keeps the Kit Digital 2026 campaign", () => {
    const row = kitDigital2026Lead(
      {
        name: "Nuria",
        email: "nuria@example.com",
        phone: "633333333",
        services: ["Web"],
        businessType: "pyme",
        employees: "1-2",
        sectors: [],
      },
      { utmSource: "google", utmCampaign: "kit-search" },
    );
    expect(row.channel).toBe("google ads");
    expect(row.campaign).toBe("Kit Digital 2026");
  });
});

describe("promoVeranoLead", () => {
  test("organic visit → channel promo-verano, fixed campaign, consent recorded", () => {
    const row = promoVeranoLead({ email: "lead@example.com", consentAt: "2026-07-08T10:00:00.000Z" });
    expect(row.email).toBe("lead@example.com");
    expect(row.channel).toBe("promo-verano");
    expect(row.campaign).toBe("promo-verano-2026");
    expect(row.notes).toContain("Promo Verano");
    expect(row.notes).toContain("Consentimiento");
    expect(row.notes).toContain("2026-07-08T10:00:00.000Z");
    expect(row.phone).toBeNull();
  });

  test("records the phone when the lead provides one", () => {
    const row = promoVeranoLead({
      email: "lead@example.com",
      phone: "600123456",
      consentAt: "2026-07-08T10:00:00.000Z",
    });
    expect(row.phone).toBe("600123456");
  });

  test("ad traffic sets the channel from UTMs but keeps the promo campaign", () => {
    const row = promoVeranoLead(
      { email: "lead@example.com", consentAt: "2026-07-08T10:00:00.000Z" },
      { utmSource: "google", utmCampaign: "verano-search" },
    );
    expect(row.channel).toBe("google ads");
    expect(row.campaign).toBe("promo-verano-2026");
  });
});
