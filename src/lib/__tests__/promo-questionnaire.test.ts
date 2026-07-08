import { describe, expect, test } from "vitest";
import {
  promoQuestionnaireFields,
  formatQuestionnaireNotes,
  type PromoQuestionnaireInput,
} from "../promo-questionnaire";

const base: PromoQuestionnaireInput = {
  leadId: "lead-1",
  email: "lead@example.com",
  name: "Marta Ruiz",
  businessName: "La Tostadora",
  phone: "600111222",
  activity: "Cafetería de especialidad",
  sector: "Hostelería",
  services: "Café de especialidad, brunch, catering",
  need: "Web",
  currentWebsite: "https://latostadora.example",
  style: "Minimalista y cálido",
  colors: "Tierra y crema",
  typography: "Serif elegante",
  references: "https://ref.example",
  social: "@latostadora en Instagram",
  logoPath: "promo/lead-1-logo.png",
  extra: "Abrimos un segundo local en septiembre",
};

describe("promoQuestionnaireFields", () => {
  test("maps questionnaire answers to CRM column names", () => {
    const f = promoQuestionnaireFields(base);
    expect(f.id).toBe("lead-1");
    expect(f.email).toBe("lead@example.com");
    expect(f.name).toBe("Marta Ruiz");
    expect(f.businessName).toBe("La Tostadora");
    expect(f.sector).toBe("Hostelería");
    expect(f.businessType).toBe("Web");
    expect(f.style).toBe("Minimalista y cálido");
    expect(f.palette).toBe("Tierra y crema");
    expect(f.valueProp).toBe("Cafetería de especialidad");
    expect(f.currentWebsite).toBe("https://latostadora.example");
  });
});

describe("formatQuestionnaireNotes", () => {
  test("serializes fields that have no dedicated column", () => {
    const n = formatQuestionnaireNotes(base);
    expect(n).toContain("Servicios: Café de especialidad, brunch, catering");
    expect(n).toContain("Tipografía: Serif elegante");
    expect(n).toContain("Referencias: https://ref.example");
    expect(n).toContain("Redes/presencia: @latostadora en Instagram");
    expect(n).toContain("Logo: promo/lead-1-logo.png");
    expect(n).toContain("Otros: Abrimos un segundo local en septiembre");
  });

  test("omits empty optional fields cleanly", () => {
    const n = formatQuestionnaireNotes({ ...base, references: "", social: "", logoPath: null, extra: "" });
    expect(n).not.toContain("Referencias:");
    expect(n).not.toContain("Redes/presencia:");
    expect(n).not.toContain("Logo:");
    expect(n).not.toContain("Otros:");
  });
});
