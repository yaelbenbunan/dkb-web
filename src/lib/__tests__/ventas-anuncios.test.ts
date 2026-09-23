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

  test("recorta campos demasiado largos en vez de guardarlos enteros", () => {
    const larguisimo = "x".repeat(500);
    const telefonoLargo = "6".repeat(100);
    // 248 + "@bb.es" (6) = 254: lo que sobrevive al recorte de 254 sigue siendo un email válido.
    const emailLargo = `${"a".repeat(248)}@bb.esxx`;
    const r = leadDesdeAnuncio({
      negocio: larguisimo,
      contacto: larguisimo,
      ciudad: larguisimo,
      web: larguisimo,
      cif: larguisimo,
      telefono: telefonoLargo,
      email: emailLargo,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.lead.negocio.length).toBe(200);
    expect(r.lead.contacto.length).toBe(200);
    expect(r.lead.ciudad.length).toBe(200);
    expect(r.lead.web.length).toBe(200);
    expect(r.lead.cif.length).toBe(200);
    expect(r.lead.telefono.length).toBe(40);
    expect(r.lead.email.length).toBe(254);
    expect(r.lead.email.endsWith("@bb.es")).toBe(true);
  });
});
