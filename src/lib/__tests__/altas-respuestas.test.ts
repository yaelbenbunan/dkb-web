import { describe, expect, test } from "vitest";
import { SECCIONES_ALTA, leerRespuestasAlta, valorLegible } from "@/lib/altas/preguntas";

/** Lo mínimo que pide el formulario para enviarse. */
function minimas(): Record<string, unknown> {
  return {
    contacto_nombre: "Laura Pérez",
    contacto_email: "laura@nubosoft.es",
    contacto_telefono: "+34 600 000 000",
    razon_social: "Nubosoft S.L.",
    cif: "B12345678",
    direccion_facturacion: "Calle Mayor 1, 28001 Madrid",
    email_facturas: "facturas@nubosoft.es",
    servicios: "Software de gestión en la nube",
    diferencia: "Soporte en 1 hora",
    tipo_cliente: "b2b",
    cliente_ideal: "Pymes de 10 a 50 empleados",
    zona: "espana",
    presupuesto: "300_600",
    forma_pago: "tarjeta",
    consentimiento_marca: true,
  };
}

describe("preguntas del alta", () => {
  test("son 8 secciones con ids únicos en todo el formulario", () => {
    expect(SECCIONES_ALTA).toHaveLength(8);
    const ids = SECCIONES_ALTA.flatMap((s) => s.campos.map((c) => c.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("acepta lo mínimo y limpia espacios", () => {
    const r = leerRespuestasAlta({ ...minimas(), contacto_nombre: "  Laura Pérez  " });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.datos.contacto_nombre).toBe("Laura Pérez");
  });

  test("faltan obligatorios: dice cuál", () => {
    const { razon_social: _quitado, ...resto } = minimas();
    void _quitado;
    const r = leerRespuestasAlta(resto);
    expect(r).toMatchObject({ ok: false, campo: "razon_social", error: expect.stringMatching(/razón social/i) });
  });

  test("un obligatorio con solo espacios cuenta como vacío", () => {
    expect(leerRespuestasAlta({ ...minimas(), servicios: "   " }).ok).toBe(false);
  });

  test("el consentimiento de uso de marca es obligatorio", () => {
    expect(leerRespuestasAlta({ ...minimas(), consentimiento_marca: false })).toMatchObject({ ok: false, error: expect.stringMatching(/consentimiento|autoriz/i) });
  });

  test("emails no válidos se rechazan", () => {
    expect(leerRespuestasAlta({ ...minimas(), contacto_email: "laura@" }).ok).toBe(false);
    expect(leerRespuestasAlta({ ...minimas(), email_facturas: "sin arroba" }).ok).toBe(false);
  });

  test("las URLs tienen que ser http o https", () => {
    expect(leerRespuestasAlta({ ...minimas(), web: "javascript:alert(1)" }).ok).toBe(false);
    expect(leerRespuestasAlta({ ...minimas(), web: "ftp://x.es" }).ok).toBe(false);
    const ok = leerRespuestasAlta({ ...minimas(), web: "https://nubosoft.es" });
    expect(ok.ok).toBe(true);
  });

  test("una web sin protocolo se completa con https://", () => {
    const r = leerRespuestasAlta({ ...minimas(), web: "nubosoft.es" });
    expect(r.ok && r.datos.web).toBe("https://nubosoft.es");
  });

  test("opciones cerradas: un valor de fuera se rechaza", () => {
    expect(leerRespuestasAlta({ ...minimas(), tono: "agresivo" }).ok).toBe(false);
    expect(leerRespuestasAlta({ ...minimas(), presupuesto: "1000000" }).ok).toBe(false);
    expect(leerRespuestasAlta({ ...minimas(), objetivos_branding: ["trafico", "hackear"] }).ok).toBe(false);
    const r = leerRespuestasAlta({ ...minimas(), tono: "cercano", objetivos_branding: ["trafico", "seguidores", "trafico"] });
    expect(r.ok && r.datos.objetivos_branding).toEqual(["trafico", "seguidores"]);
  });

  test("longitudes máximas", () => {
    expect(leerRespuestasAlta({ ...minimas(), contacto_nombre: "a".repeat(201) }).ok).toBe(false);
    expect(leerRespuestasAlta({ ...minimas(), servicios: "a".repeat(4001) }).ok).toBe(false);
    expect(leerRespuestasAlta({ ...minimas(), servicios: "a".repeat(4000) }).ok).toBe(true);
  });

  test("teléfonos: solo dígitos y signos de teléfono", () => {
    expect(leerRespuestasAlta({ ...minimas(), contacto_telefono: "llámame" }).ok).toBe(false);
    expect(leerRespuestasAlta({ ...minimas(), whatsapp_telefono: "+34 (600) 11-22-33" }).ok).toBe(true);
  });

  test("competencia: hasta 5, quita las filas vacías y valida la web", () => {
    const filas = [
      { nombre: "Holded", web: "holded.com" },
      { nombre: "", web: "" },
      { nombre: "Sage", web: "" },
    ];
    const r = leerRespuestasAlta({ ...minimas(), competencia: filas });
    expect(r.ok && r.datos.competencia).toEqual([{ nombre: "Holded", web: "https://holded.com" }, { nombre: "Sage" }]);
    const seis = Array.from({ length: 6 }, (_, i) => ({ nombre: `C${i}`, web: "" }));
    expect(leerRespuestasAlta({ ...minimas(), competencia: seis }).ok).toBe(false);
    expect(leerRespuestasAlta({ ...minimas(), competencia: [{ nombre: "X", web: "javascript:1" }] }).ok).toBe(false);
  });

  test("sí/no: booleano o sin contestar", () => {
    const r = leerRespuestasAlta({ ...minimas(), facebook: true, instagram: false, portfolio_meta: null });
    expect(r.ok && [r.datos.facebook, r.datos.instagram, r.datos.portfolio_meta]).toEqual([true, false, undefined]);
    expect(leerRespuestasAlta({ ...minimas(), facebook: "quizá" }).ok).toBe(false);
  });

  test("ignora claves que no son preguntas (no se guardan)", () => {
    const r = leerRespuestasAlta({ ...minimas(), __proto__x: "1", admin: true, archivos: ["x"] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.datos).not.toHaveProperty("admin");
      expect(r.datos).not.toHaveProperty("archivos");
    }
  });

  test("rechaza algo que no es un objeto", () => {
    expect(leerRespuestasAlta(null).ok).toBe(false);
    expect(leerRespuestasAlta("hola").ok).toBe(false);
    expect(leerRespuestasAlta([1, 2]).ok).toBe(false);
  });

  test("valorLegible traduce opciones, casillas, sí/no y competencia", () => {
    const campos = Object.fromEntries(SECCIONES_ALTA.flatMap((s) => s.campos).map((c) => [c.id, c]));
    expect(valorLegible(campos.tono, "tecnico")).toBe("Técnico");
    expect(valorLegible(campos.objetivos_branding, ["trafico", "otro"])).toBe("Tráfico a la web, Otro");
    expect(valorLegible(campos.facebook, true)).toBe("Sí");
    expect(valorLegible(campos.facebook, undefined)).toBe("");
    expect(valorLegible(campos.competencia, [{ nombre: "Holded", web: "https://holded.com" }])).toBe("Holded (https://holded.com)");
  });
});
