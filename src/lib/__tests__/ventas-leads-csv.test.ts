import { describe, expect, test } from "vitest";
import {
  parseVentasLeadsCsv,
  clasificarLeads,
  clavesContacto,
  plantillaVentasCsv,
  VENTAS_CSV_HEADERS,
} from "../ventas/leads-csv";

describe("parseVentasLeadsCsv", () => {
  test("lee la plantilla con separador de coma", () => {
    const csv = "negocio,tipo_negocio,contacto,telefono,email,ciudad,cif,web\nGym Sol,gimnasio,Laura,600111222,laura@sol.es,Madrid,,";
    const r = parseVentasLeadsCsv(csv);
    expect(r.errores).toEqual([]);
    expect(r.filas).toEqual([
      {
        negocio: "Gym Sol",
        tipo_negocio: "gimnasio",
        contacto: "Laura",
        telefono: "600111222",
        email: "laura@sol.es",
        ciudad: "Madrid",
        cif: "",
        web: "",
      },
    ]);
  });

  test("acepta cabeceras con otro nombre y punto y coma (Excel)", () => {
    const csv = "Empresa;Teléfono;Correo;Localidad\nFisio Norte;+34 611 22 33 44;;Bilbao";
    const r = parseVentasLeadsCsv(csv);
    expect(r.filas[0]).toMatchObject({ negocio: "Fisio Norte", telefono: "+34 611 22 33 44", ciudad: "Bilbao" });
  });

  test("sin columna de negocio no importa nada", () => {
    const r = parseVentasLeadsCsv("telefono,email\n600111222,a@b.es");
    expect(r.filas).toEqual([]);
    expect(r.errores[0].message).toContain("negocio");
  });

  test("cada fila mala se reporta con su línea", () => {
    const csv = "negocio,telefono,email\n,600111222,\nSin contacto,,\nMal email,,no-es-email";
    const r = parseVentasLeadsCsv(csv);
    expect(r.filas).toEqual([]);
    expect(r.errores.map((e) => e.line)).toEqual([2, 3, 4]);
  });

  test("un tipo de negocio desconocido no bloquea: queda vacío y avisa", () => {
    const r = parseVentasLeadsCsv("negocio,tipo_negocio,telefono\nPelu,peluquería,600111222");
    expect(r.errores).toEqual([]);
    expect(r.filas[0].tipo_negocio).toBeNull();
    expect(r.avisos[0]).toMatchObject({ line: 2 });
  });

  test("ignora filas vacías y avisa de cabeceras desconocidas", () => {
    const r = parseVentasLeadsCsv("negocio,telefono,notas\nGym,600111222,x\n,,\n");
    expect(r.filas).toHaveLength(1);
    expect(r.cabecerasDesconocidas).toEqual(["notas"]);
  });

  test("la plantilla se puede volver a leer sin errores", () => {
    const r = parseVentasLeadsCsv(plantillaVentasCsv());
    expect(r.errores).toEqual([]);
    expect(r.filas).toHaveLength(1);
    expect(plantillaVentasCsv().split("\n")[0]).toBe(VENTAS_CSV_HEADERS.join(","));
  });
});

describe("clasificarLeads", () => {
  const lead = (email: string, telefono = "") => ({ email, telefono, cif: "" });

  test("separa nuevos, duplicados en la marca y excluidos", () => {
    const r = clasificarLeads(
      [lead("nuevo@a.es"), lead("ya@a.es"), lead("cliente@a.es")],
      [{ email: "YA@a.es" }],
      [{ email: "cliente@a.es" }],
    );
    expect(r.nuevos.map((l) => l.email)).toEqual(["nuevo@a.es"]);
    expect(r.duplicados.map((l) => l.email)).toEqual(["ya@a.es"]);
    expect(r.excluidos.map((l) => l.email)).toEqual(["cliente@a.es"]);
  });

  test("detecta el duplicado por teléfono aunque cambie el formato", () => {
    const r = clasificarLeads([lead("", "+34 600 11 22 33")], [{ telefono: "600112233" }], []);
    expect(r.duplicados).toHaveLength(1);
  });

  test("dos filas iguales en el mismo fichero: la segunda es duplicado", () => {
    const r = clasificarLeads([lead("a@a.es"), lead("A@a.es")], [], []);
    expect(r.nuevos).toHaveLength(1);
    expect(r.duplicados).toHaveLength(1);
  });

  test("la exclusión también casa por CIF", () => {
    const r = clasificarLeads([{ email: "x@a.es", telefono: "", cif: "b-12345678" }], [], [{ cif: "B12345678" }]);
    expect(r.excluidos).toHaveLength(1);
  });

  test("excluido pesa más que duplicado", () => {
    const r = clasificarLeads([lead("c@a.es")], [{ email: "c@a.es" }], [{ email: "c@a.es" }]);
    expect(r.excluidos).toHaveLength(1);
    expect(r.duplicados).toHaveLength(0);
  });
});

describe("clavesContacto", () => {
  test("genera una clave por cada dato de contacto presente", () => {
    expect(clavesContacto({ email: "A@b.es", telefono: "600112233", cif: "b1" })).toEqual([
      "e:a@b.es",
      "t:600112233",
      "c:B1",
    ]);
    expect(clavesContacto({})).toEqual([]);
  });
});
