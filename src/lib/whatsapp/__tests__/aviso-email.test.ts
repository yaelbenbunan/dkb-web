import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../../ventas/db", () => ({ getLead: vi.fn(), getMarcaPorId: vi.fn() }));

import { construirAvisoLead, destinatariasAviso } from "../aviso-email";

describe("destinatariasAviso", () => {
  it("lee emails separados por comas y descarta lo que no lo es", () => {
    expect(destinatariasAviso(" paula@dinkbit.com, nada ,yael@dinkbit.com")).toEqual(["paula@dinkbit.com", "yael@dinkbit.com"]);
    expect(destinatariasAviso(undefined)).toEqual([]);
  });
});

describe("construirAvisoLead", () => {
  it("dice quién espera, su teléfono, qué pasó y enlaza a su ficha", () => {
    const c = construirAvisoLead({ leadId: "l1", negocio: "Clínica Sonrisas", telefono: "611222333", nota: "El lead respondió: «Llamadme hoy»." });
    expect(c.subject).toBe("WhatsApp: Clínica Sonrisas espera respuesta");
    expect(c.text).toContain("611222333");
    expect(c.text).toContain("Llamadme hoy");
    expect(c.html).toContain("/panel/ventas/dinkbit/leads/l1");
  });
});
