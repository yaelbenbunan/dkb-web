import { describe, expect, test } from "vitest";
import {
  decodeCsvBytes,
  dedupeKey,
  detectDelimiter,
  leadsCsvTemplate,
  LEADS_CSV_HEADERS,
  LEADS_CSV_MAX_ROWS,
  parseChannel,
  parseConsent,
  parseCsv,
  parseLeadsCsv,
  parseStatus,
} from "../leads-csv";

const header = "nombre,telefono,email,web,canal,campana,estado,consentimiento,notas";

describe("parseCsv", () => {
  test("separa celdas y filas", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  test("respeta comillas: separador, salto de línea y comilla escapada dentro", () => {
    const csv = 'nombre,notas\n"Ruiz, S.L.","Dijo: ""llámame"" el\nlunes"';
    expect(parseCsv(csv)).toEqual([
      ["nombre", "notas"],
      ["Ruiz, S.L.", 'Dijo: "llámame" el\nlunes'],
    ]);
  });

  test("acepta finales de línea Windows y última fila sin salto", () => {
    expect(parseCsv("a,b\r\n1,2\r\n3,4")).toEqual([
      ["a", "b"],
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  test("se come el BOM que pone Excel", () => {
    expect(parseCsv("﻿nombre,email")).toEqual([["nombre", "email"]]);
  });

  test("celdas vacías se mantienen en su posición", () => {
    expect(parseCsv("a,,c")).toEqual([["a", "", "c"]]);
  });
});

describe("decodeCsvBytes", () => {
  test("UTF-8 se decodifica tal cual", () => {
    const bytes = new TextEncoder().encode("nombre\nAna García");
    expect(decodeCsvBytes(bytes)).toBe("nombre\nAna García");
  });

  test("Windows-1252 (el CSV que exporta Excel en español) no rompe los acentos", () => {
    // "Ana García" en Windows-1252: la í es 0xED, un byte inválido en UTF-8.
    const bytes = new Uint8Array([0x41, 0x6e, 0x61, 0x20, 0x47, 0x61, 0x72, 0x63, 0xed, 0x61]);
    expect(decodeCsvBytes(bytes)).toBe("Ana García");
  });
});

describe("detectDelimiter", () => {
  test("coma, punto y coma y tabulador", () => {
    expect(detectDelimiter("a,b,c\n1,2,3")).toBe(",");
    expect(detectDelimiter("a;b;c\n1;2;3")).toBe(";");
    expect(detectDelimiter("a\tb\tc")).toBe("\t");
  });

  test("una sola columna cae a coma", () => {
    expect(detectDelimiter("email\nana@x.com")).toBe(",");
  });
});

describe("parseStatus", () => {
  test("acepta el slug", () => {
    expect(parseStatus("kit-digital")).toBe("kit-digital");
    expect(parseStatus("cliente-kit-digital")).toBe("cliente-kit-digital");
  });

  test("acepta la etiqueta visible, sin importar acentos ni mayúsculas", () => {
    expect(parseStatus("Interés en Kit Digital")).toBe("kit-digital");
    expect(parseStatus("interes en kit digital")).toBe("kit-digital");
    expect(parseStatus("Cliente Kit Digital")).toBe("cliente-kit-digital");
    expect(parseStatus("VOLVER A LLAMAR")).toBe("seguimiento");
  });

  test("vacío = nuevo; desconocido = null", () => {
    expect(parseStatus("")).toBe("nuevo");
    expect(parseStatus("   ")).toBe("nuevo");
    expect(parseStatus("pendiente de algo")).toBeNull();
  });
});

describe("parseConsent", () => {
  test("sí / no en varias formas", () => {
    for (const v of ["sí", "Si", "SÍ", "yes", "true", "1", "x"]) {
      expect(parseConsent(v)).toBe(true);
    }
    for (const v of ["no", "NO", "false", "0"]) {
      expect(parseConsent(v)).toBe(false);
    }
  });

  test("vacío = sin definir; basura = no reconocido", () => {
    expect(parseConsent("")).toBeNull();
    expect(parseConsent("quizás")).toBeUndefined();
  });
});

describe("parseChannel", () => {
  test("normaliza a la capitalización del panel", () => {
    expect(parseChannel("meta")).toBe("Meta");
    expect(parseChannel("GOOGLE ADS")).toBe("google ads");
    expect(parseChannel("linkedin")).toBe("LinkedIn");
  });

  test("vacío = Web; desconocido se guarda tal cual", () => {
    expect(parseChannel("")).toBe("Web");
    expect(parseChannel("Feria")).toBe("Feria");
  });
});

describe("dedupeKey", () => {
  test("el email manda y no distingue mayúsculas", () => {
    expect(dedupeKey({ email: "Ana@X.com", phone: "600112233" })).toBe("e:ana@x.com");
  });

  test("sin email, el teléfono en dígitos con y sin prefijo es el mismo", () => {
    expect(dedupeKey({ phone: "+34 600 11 22 33" })).toBe(dedupeKey({ phone: "600112233" }));
  });

  test("sin datos suficientes no hay clave", () => {
    expect(dedupeKey({})).toBeNull();
    expect(dedupeKey({ phone: "12" })).toBeNull();
  });
});

describe("parseLeadsCsv", () => {
  test("fila completa se convierte en lead", () => {
    const { rows, errors } = parseLeadsCsv(
      `${header}\nAna García,+34 600 11 22 33,ana@x.com,x.com,meta,Feria,contactado,Sí,Buen encaje`,
    );
    expect(errors).toEqual([]);
    expect(rows).toEqual([
      {
        name: "Ana García",
        phone: "+34 600 11 22 33",
        email: "ana@x.com",
        website: "x.com",
        channel: "Meta",
        campaign: "Feria",
        notes: "Buen encaje",
        status: "contactado",
        consent: true,
      },
    ]);
  });

  test("columnas mínimas y valores por defecto", () => {
    const { rows, errors } = parseLeadsCsv("email\nana@x.com");
    expect(errors).toEqual([]);
    expect(rows[0]).toMatchObject({
      email: "ana@x.com",
      name: "",
      channel: "Web",
      status: "nuevo",
      consent: null,
    });
  });

  test("cabeceras en cualquier orden, con acentos, sinónimos y mayúsculas", () => {
    const { rows, errors } = parseLeadsCsv("Correo;Teléfono;NOMBRE\nana@x.com;600112233;Ana");
    expect(errors).toEqual([]);
    expect(rows[0]).toMatchObject({ name: "Ana", phone: "600112233", email: "ana@x.com" });
  });

  test("avisa de cabeceras que no reconoce, pero importa igual", () => {
    const { rows, unknownHeaders } = parseLeadsCsv("nombre,sector\nAna,dental");
    expect(unknownHeaders).toEqual(["sector"]);
    expect(rows).toHaveLength(1);
  });

  test("una fila mala no tumba el resto y se reporta con su nº de línea", () => {
    const csv = [
      header,
      "Ana,600112233,ana@x.com,,,,,,",
      ",,,,,,,,solo unas notas", // con datos pero sin nombre/teléfono/email
      "Luis,,correo-malo,,,,,,",
      "Marta,,marta@x.com,,,,estado-raro,,",
      "Sara,,sara@x.com,,,,,quizás,",
      "Pedro,600998877,pedro@x.com,,,,,,",
    ].join("\n");
    const { rows, errors } = parseLeadsCsv(csv);
    expect(rows.map((r) => r.name)).toEqual(["Ana", "Pedro"]);
    expect(errors.map((e) => e.line)).toEqual([3, 4, 5, 6]);
    expect(errors[1].message).toContain("Email no válido");
    expect(errors[2].message).toContain("Estado desconocido");
    expect(errors[3].message).toContain("Consentimiento");
  });

  test("las líneas totalmente en blanco se ignoran sin dar error", () => {
    const { rows, errors } = parseLeadsCsv(`${header}\nAna,,ana@x.com,,,,,,\n\n\nLuis,,luis@x.com,,,,,,`);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(2);
  });

  test("descarta repetidos dentro del mismo fichero", () => {
    const csv = [
      header,
      "Ana,,ana@x.com,,,,,,",
      "Ana (bis),,ANA@x.com,,,,,,",
      "Luis,+34 600 11 22 33,,,,,,,",
      "Luis (bis),600112233,,,,,,,",
    ].join("\n");
    const { rows, errors } = parseLeadsCsv(csv);
    expect(rows.map((r) => r.name)).toEqual(["Ana", "Luis"]);
    expect(errors).toHaveLength(2);
    expect(errors[0].message).toContain("Repetido");
  });

  test("fichero vacío o sin columnas útiles", () => {
    expect(parseLeadsCsv("").errors[0].message).toContain("vacío");
    expect(parseLeadsCsv("sector,notas\ndental,x").errors[0].message).toContain(
      "No se reconoce ninguna columna",
    );
  });

  test("corta en el máximo de filas y avisa", () => {
    const body = Array.from(
      { length: LEADS_CSV_MAX_ROWS + 5 },
      (_, i) => `Lead ${i},,lead${i}@x.com,,,,,,`,
    );
    const { rows, errors } = parseLeadsCsv([header, ...body].join("\n"));
    expect(rows).toHaveLength(LEADS_CSV_MAX_ROWS);
    expect(errors[0].message).toContain(`primeras ${LEADS_CSV_MAX_ROWS}`);
  });

  test("acepta punto y coma como separador (export de Excel en español)", () => {
    const { rows, errors } = parseLeadsCsv(
      "nombre;telefono;email\nAna García;600112233;ana@x.com",
    );
    expect(errors).toEqual([]);
    expect(rows[0]).toMatchObject({ name: "Ana García", email: "ana@x.com" });
  });
});

describe("leadsCsvTemplate", () => {
  test("empieza con BOM y con las cabeceras oficiales", () => {
    const t = leadsCsvTemplate();
    expect(t.startsWith("﻿")).toBe(true);
    expect(t.split("\r\n")[0].replace("﻿", "")).toBe(LEADS_CSV_HEADERS.join(","));
  });

  test("la plantilla se importa a sí misma sin errores", () => {
    const { rows, errors, unknownHeaders } = parseLeadsCsv(leadsCsvTemplate());
    expect(errors).toEqual([]);
    expect(unknownHeaders).toEqual([]);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ name: "Ana García", status: "nuevo", consent: true });
    expect(rows[2]).toMatchObject({ status: "cliente-kit-digital", consent: null });
  });
});
