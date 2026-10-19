import { describe, expect, test } from "vitest";
import {
  constitucionAProspecto,
  documentosSeccionA,
  fechaBorme,
  parsearConstituciones,
  provinciaBorme,
  type FilaBorme,
} from "../borme";

/** Fragmento real del BORME del 16-10-2026 (Madrid y Menorca), nombres de administradores cambiados. */
const XML = `<?xml version="1.0" encoding="UTF-8"?>
<documento fecha_actualizacion="20261016T071825Z">
  <texto>
    <p class="articulo">460940 - NENES PURPURINA SL.</p>
    <p class="parrafo">Nombramientos. Adm. Solid.: PEREZ PEREZ ANA. Datos registrales. T 43317 , F 116, S 8, H M 765274, I/A 1 (12.04.22).</p>
    <p class="articulo">460946 - RAVAC BRANDS GROUP SL.</p>
    <p class="parrafo">Constitución. Comienzo de operaciones: 4.09.26. Objeto social: a) La adquisición,suscripción, tenencia   de acciones. b)EI comercio al por mayor. Domicilio: C/ BLAS CABRERA 13 4 IZ (MADRID). Capital: 3.009,35 Euros. Nombramientos. Adm. Unico: GARCIA LOPEZ JUAN.  Datos registrales. S 8 , H M 897902, I/A 1 ( 8.10.26).</p>
    <p class="articulo">460949 - F&amp;F EXPERIENCIAS GASTRONOMICAS SL.</p>
    <p class="parrafo">Constitución. Comienzo de operaciones: 16.09.26. Objeto social: la gestión de eventos y retail. Domicilio: C/ PRINCESA DE EBOLI 2 Ptl.R 2 C (SAN SEBASTIAN DE LOS REYES). Capital: 3.000,00 Euros. Declaración de unipersonalidad. Socio único: MARTIN MARTIN OSCAR. Nombramientos. Adm. Unico: MARTIN MARTIN OSCAR.  Datos registrales. S 8 , H M 898061, I/A 1 ( 8.10.26).</p>
    <p class="articulo">459897 - SA PERDIU FERRERIES SOCIEDAD LIMITADA(R.M. MAHON).</p>
    <p class="parrafo">Constitución. Comienzo de operaciones: 1.10.26. Objeto social: Restaurantes y puestos de comidas. Domicilio: C/ PALAU I QUER, 2 1º 2º 07760 (CIUTADELLA DE MENORCA). Capital: 3.000,00 Euros. Nombramientos. Adm. Unico: SASTRE SASTRE MARIA. Página web de la sociedad. Creación de la página web corporativa: www.saperdiu.com.  Datos registrales. S 8 , H PM 1234, I/A 1 ( 7.10.26).</p>
    <p class="articulo">441026 - ALTEA VELL SL.</p>
    <p class="parrafo">Constitución. Comienzo de operaciones: 1.10.26. Objeto social: Hostelería. Domicilio: CMNO VELL D' ALTEA 35 (ALFAS DEL PI (L')). Capital: 3.000,00 Euros. Declaración de unipersonalidad. Socio único: ROCA ROCA ISAIAS. Nombramientos. Adm. Unico: ROCA ROCA ISAIAS. Datos registrales. S 8 , H A 208420, I/A 1 (28.09.26).</p>
    <p class="articulo">461104 - GROWTH CAPITAL PARTNERSHIP FUND I, FCRE SA.</p>
    <p class="parrafo">Constitución. Comienzo de operaciones: INS. REG. CNMV. Objeto social: Fondo de capital riesgo... Domicilio: C/ SERRANO 37 - 4ª PLANTA (MADRID). Capital suscrito: 60.000,00 Euros. Desembolsado: 15.000,00 Euros. Nombramientos. Representan: CALDERON CALDERON IGNACIO.  Datos registrales. S 8 , H M 899312, I/A 1 ( 8.10.26).</p>
  </texto>
</documento>`;

const DOC = {
  bormeId: "BORME-A-2026-200-28",
  provincia: "Madrid",
  fecha: "2026-10-16",
  urlPdf: "https://www.boe.es/borme/dias/2026/10/16/pdfs/BORME-A-2026-200-28.pdf",
};

describe("parsearConstituciones", () => {
  const filas = parsearConstituciones(XML, DOC);

  test("solo las constituciones", () => {
    expect(filas.map((f) => f.id)).toEqual(["2026-460946", "2026-460949", "2026-459897", "2026-441026", "2026-461104"]);
  });

  test("datos de la sociedad", () => {
    expect(filas[0]).toEqual<FilaBorme>({
      id: "2026-460946",
      nombre: "RAVAC BRANDS GROUP SL",
      fecha_publicacion: "2026-10-16",
      inicio_operaciones: "2026-09-04",
      objeto: "a) La adquisición,suscripción, tenencia de acciones. b)EI comercio al por mayor.",
      domicilio: "C/ BLAS CABRERA 13 4 IZ",
      municipio: "Madrid",
      municipio_clave: "madrid",
      provincia: "Madrid",
      capital: 3009.35,
      web: null,
      borme_id: "BORME-A-2026-200-28",
      url_pdf: DOC.urlPdf,
    });
  });

  test("no guarda ningún nombre de persona: ni administradores ni socio único", () => {
    const todo = JSON.stringify(filas);
    for (const persona of ["GARCIA LOPEZ", "MARTIN MARTIN", "SASTRE SASTRE", "CALDERON", "PEREZ PEREZ", "ROCA ROCA"]) {
      expect(todo).not.toContain(persona);
    }
  });

  test("entidades HTML, municipio compuesto y nombre del registro", () => {
    expect(filas[1].nombre).toBe("F&F EXPERIENCIAS GASTRONOMICAS SL");
    expect(filas[1].municipio).toBe("San Sebastian de los Reyes");
    expect(filas[1].municipio_clave).toBe("san sebastian de los reyes");
    expect(filas[2].nombre).toBe("SA PERDIU FERRERIES SOCIEDAD LIMITADA");
    expect(filas[2].municipio).toBe("Ciutadella de Menorca");
  });

  test("la web que declara la sociedad", () => {
    expect(filas[2].web).toBe("https://www.saperdiu.com");
  });

  test("municipio con paréntesis dentro: el domicilio no se come lo que sigue", () => {
    expect(filas[3].domicilio).toBe("CMNO VELL D' ALTEA 35");
    expect(filas[3].municipio).toBe("L'Alfas del Pi");
  });

  test("el artículo del municipio va delante, como se busca", () => {
    const xml = `<p class="articulo">2 - Y SL.</p><p class="parrafo">Constitución. Objeto social: Bar. Domicilio: C/ REAL 1 (ROZAS DE MADRID (LAS)). Capital: 3.000,00 Euros.</p>`;
    const [f] = parsearConstituciones(xml, DOC);
    expect(f.municipio).toBe("Las Rozas de Madrid");
    expect(f.municipio_clave).toBe("las rozas de madrid");
  });

  test("paréntesis descuadrados en el original", () => {
    const xml = (dom: string) =>
      `<p class="articulo">1 - X SL.</p><p class="parrafo">Constitución. Objeto social: Bar. Domicilio: ${dom}. Capital: 3.000,00 Euros. Nombramientos. ADM.UNICO: NOMBRE PERSONA.</p>`;
    const [a] = parsearConstituciones(xml("CR DEL MIG NUM.12 (HOSPITALET DE LLOBREGAT (L'"), DOC);
    expect(a.domicilio).toBe("CR DEL MIG NUM.12");
    expect(a.municipio).toBe("L'Hospitalet de Llobregat");
    const [b] = parsearConstituciones(xml("C/ JINETE, 13, BARCA DE LA FLORIDA ( (JEREZ DE LA FRONTERA)"), DOC);
    expect(b.domicilio).toBe("C/ JINETE, 13, BARCA DE LA FLORIDA");
    expect(b.municipio).toBe("Jerez de la Frontera");
    expect(JSON.stringify([a, b])).not.toContain("PERSONA");
  });

  test("capital suscrito y comienzo de operaciones que no es fecha", () => {
    expect(filas[4].capital).toBe(60000);
    expect(filas[4].inicio_operaciones).toBeNull();
    expect(filas[4].domicilio).toBe("C/ SERRANO 37 - 4ª PLANTA");
  });

  test("un XML sin constituciones da lista vacía", () => {
    expect(parsearConstituciones("<documento><texto></texto></documento>", DOC)).toEqual([]);
  });
});

describe("fechaBorme", () => {
  test("d.mm.aa a ISO", () => {
    expect(fechaBorme("4.09.26")).toBe("2026-09-04");
    expect(fechaBorme("28.12.25")).toBe("2025-12-28");
  });
  test("lo que no es fecha da null", () => {
    expect(fechaBorme("INS. REG. CNMV")).toBeNull();
    expect(fechaBorme("31.02.26")).toBeNull();
  });
});

describe("provinciaBorme", () => {
  test("los títulos del sumario, bilingües incluidos", () => {
    expect(provinciaBorme("MADRID")).toBe("Madrid");
    expect(provinciaBorme("ALICANTE/ALACANT")).toBe("Alicante");
    expect(provinciaBorme("VALENCIA/VALÈNCIA")).toBe("Valencia");
    expect(provinciaBorme("ARABA/ÁLAVA")).toBe("Araba/Álava");
    expect(provinciaBorme("A CORUÑA")).toBe("A Coruña");
    expect(provinciaBorme("ILLES BALEARS")).toBe("Illes Balears");
    expect(provinciaBorme("SANTA CRUZ DE TENERIFE")).toBe("Santa Cruz de Tenerife");
  });
  test("el índice alfabético no es una provincia", () => {
    expect(provinciaBorme("ÍNDICE ALFABÉTICO DE SOCIEDADES")).toBeNull();
  });
});

describe("documentosSeccionA", () => {
  const sumario = {
    status: { code: "200" },
    data: {
      sumario: {
        diario: [
          {
            seccion: [
              {
                codigo: "A",
                item: [
                  {
                    identificador: "BORME-A-2026-200-28",
                    titulo: "MADRID",
                    url_pdf: { texto: DOC.urlPdf },
                    url_xml: "https://www.boe.es/diario_borme/xml.php?id=BORME-A-2026-200-28",
                  },
                  {
                    identificador: "BORME-A-2026-200-99",
                    titulo: "ÍNDICE ALFABÉTICO DE SOCIEDADES",
                    url_xml: "https://www.boe.es/diario_borme/xml.php?id=BORME-A-2026-200-99",
                  },
                ],
              },
              { codigo: "C", item: { identificador: "BORME-C-2026-1", titulo: "X" } },
            ],
          },
        ],
      },
    },
  };

  test("los documentos por provincia de la sección A, sin el índice", () => {
    expect(documentosSeccionA(sumario)).toEqual([
      {
        bormeId: "BORME-A-2026-200-28",
        provincia: "Madrid",
        urlXml: "https://www.boe.es/diario_borme/xml.php?id=BORME-A-2026-200-28",
        urlPdf: DOC.urlPdf,
      },
    ]);
  });

  test("un solo item viene como objeto, no como lista", () => {
    const uno = structuredClone(sumario);
    (uno.data.sumario.diario[0].seccion[0] as { item: unknown }).item = sumario.data.sumario.diario[0].seccion[0].item[0];
    expect(documentosSeccionA(uno)).toHaveLength(1);
  });

  test("una respuesta rara no rompe", () => {
    expect(documentosSeccionA(null)).toEqual([]);
    expect(documentosSeccionA({ data: {} })).toEqual([]);
  });

  test("solo URLs del BOE", () => {
    const ajeno = structuredClone(sumario);
    ajeno.data.sumario.diario[0].seccion[0].item[0].url_xml = "https://evil.example/x.xml";
    expect(documentosSeccionA(ajeno)).toEqual([]);
  });
});

describe("constitucionAProspecto", () => {
  test("prospecto borme con la dirección postal y sin teléfono ni email", () => {
    const [f] = parsearConstituciones(XML, DOC);
    expect(constitucionAProspecto(f)).toEqual({
      source: "borme",
      external_id: "2026-460946",
      name: "RAVAC BRANDS GROUP SL",
      sector: "BORME 16/10/2026 · a) La adquisición,suscripción, tenencia de acciones. b)EI comercio al por mayor.",
      address: "C/ BLAS CABRERA 13 4 IZ, Madrid",
      city: "Madrid",
      province: "Madrid",
      phone: null,
      website: null,
      email: null,
      rating: null,
      reviews: null,
    });
  });

  test("recorta el objeto social largo", () => {
    const [f] = parsearConstituciones(XML, DOC);
    const largo = constitucionAProspecto({ ...f, objeto: "x".repeat(400) });
    expect((largo.sector ?? "").length).toBeLessThanOrEqual(160);
    expect(largo.sector?.endsWith("…")).toBe(true);
  });
});
