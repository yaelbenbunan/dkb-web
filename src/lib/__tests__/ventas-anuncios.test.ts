import { describe, expect, test } from "vitest";
import { leadDesdeAnuncio } from "../ventas/anuncios";

describe("leadDesdeAnuncio", () => {
  test("lee los campos de Meta Lead Ads vía Zapier", () => {
    const r = leadDesdeAnuncio({
      full_name: "Laura Pérez",
      company_name: "Gym Sol",
      phone_number: "+34600111222",
      email: "laura@sol.es",
      campaign_name: "Muestras gimnasios",
      city: "Madrid",
    });
    expect(r).toEqual({
      ok: true,
      campana: "Muestras gimnasios",
      lead: {
        negocio: "Gym Sol",
        contacto: "Laura Pérez",
        telefono: "+34600111222",
        email: "laura@sol.es",
        ciudad: "Madrid",
        cif: "",
        web: "",
        tipo_negocio: null,
      },
    });
  });

  test("sin nombre de negocio usa el de la persona", () => {
    const r = leadDesdeAnuncio({ nombre: "Pedro", telefono: "611222333" });
    expect(r.ok && r.lead.negocio).toBe("Pedro");
  });

  test("rechaza sin teléfono ni email, o con email inválido", () => {
    expect(leadDesdeAnuncio({ negocio: "Gym" })).toEqual({ ok: false, error: "falta_contacto" });
    expect(leadDesdeAnuncio({ negocio: "Gym", email: "nope" })).toEqual({ ok: false, error: "email_invalido" });
    expect(leadDesdeAnuncio({ telefono: "611222333" })).toEqual({ ok: false, error: "falta_negocio" });
  });

  test("reconoce el tipo de negocio si viene", () => {
    const r = leadDesdeAnuncio({ negocio: "Box X", tipo_negocio: "CrossFit", email: "a@b.es" });
    expect(r.ok && r.lead.tipo_negocio).toBe("box_crossfit");
  });
});
