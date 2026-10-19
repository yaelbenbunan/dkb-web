/**
 * Carta postal para las empresas recién constituidas (prospectos del BORME).
 *
 * Va a la sociedad, a su domicilio social y «a la atención de la dirección»:
 * sin nombre de persona. El correo postal no es una comunicación electrónica,
 * así que no le aplica la LSSI; el pie da igualmente la información del art. 14
 * del RGPD (origen de los datos, base y cómo oponerse) por si la denominación
 * o el domicilio fueran de una persona. Ver
 * docs/superpowers/specs/2026-10-19-prospeccion-borme-design.md.
 */
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import { CONTACT_INFO } from "../contact-info";

const EMPRESA = {
  nombre: "Dinkbit Marketing S.L.",
  nif: "B88317391",
  domicilio: "C/ Fuerteventura 4, Planta 3, Oficina 2",
  poblacion: "28703 San Sebastián de los Reyes (Madrid)",
  ciudad: "San Sebastián de los Reyes",
  privacidad: "https://www.dinkbit.es/privacidad",
};

export interface Carta {
  remitente: string[];
  destinatario: string[];
  lugarYFecha: string;
  asunto: string;
  cuerpo: string[];
  firma: string[];
  pie: string;
}

const FECHA = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Madrid" });

export function cartaDeProspecto(
  p: { name: string; address: string | null; city: string | null; province: string | null },
  hoy: Date = new Date(),
): Carta {
  // `address` es «domicilio, municipio» (ver constitucionAProspecto): el municipio va en su línea.
  const sufijo = p.city ? `, ${p.city}` : "";
  const calle = p.address && sufijo && p.address.endsWith(sufijo) ? p.address.slice(0, -sufijo.length) : p.address;
  const poblacion = p.city ? `${p.city}${p.province ? ` (${p.province})` : ""}` : p.province;

  return {
    remitente: [EMPRESA.nombre, EMPRESA.domicilio, EMPRESA.poblacion],
    destinatario: ["A la atención de la dirección", p.name, calle, poblacion].filter((l): l is string => !!l),
    lugarYFecha: `${EMPRESA.ciudad}, ${FECHA.format(hoy)}`,
    asunto: `Una web para ${p.name}`,
    cuerpo: [
      "Estimados señores:",
      `Enhorabuena por la constitución de ${p.name}. Los primeros meses son el mejor momento para que los clientes de una empresa nueva puedan encontrarla en internet y saber a qué se dedica.`,
      "En dinkbit diseñamos webs de presentación para empresas que empiezan: rápidas, pensadas para el móvil y preparadas para aparecer en Google. Nos ocupamos de todo, del dominio a los textos, para que ustedes puedan dedicarse a su negocio.",
      `Si les interesa, escríbannos a ${CONTACT_INFO.email} o llámennos al ${CONTACT_INFO.phone} y les preparamos una propuesta sin compromiso.`,
    ],
    firma: ["Un saludo,", "", "El equipo de dinkbit", `${CONTACT_INFO.phone} · ${CONTACT_INFO.email}`],
    pie:
      `Hemos obtenido la denominación y el domicilio social de su empresa del Boletín Oficial del Registro Mercantil (BORME), ` +
      `que publica la Agencia Estatal Boletín Oficial del Estado; no tratamos datos de ninguna persona. ` +
      `Responsable: ${EMPRESA.nombre} (NIF ${EMPRESA.nif}), ${EMPRESA.domicilio}, ${EMPRESA.poblacion}. ` +
      `Finalidad: ofrecer nuestros servicios a su empresa, con base en nuestro interés legítimo. ` +
      `Si no desean recibir más comunicaciones nuestras, escriban a ${CONTACT_INFO.email} y no volveremos a escribirles. ` +
      `Más información y sus derechos en ${EMPRESA.privacidad}.`,
  };
}

/** Lo que codifica WinAnsi (la de las fuentes estándar del PDF) además de ASCII y Latin-1. */
const EXTRA_WINANSI = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");

/** Cambia por «?» lo que la fuente estándar no puede escribir: con un solo
 *  carácter raro en la denominación, pdf-lib no generaría la carta. */
export function paraWinAnsi(texto: string): string {
  return [...texto.normalize("NFC")]
    .map((c) => {
      const n = c.codePointAt(0) as number;
      return (n >= 0x20 && n <= 0x7e) || (n >= 0xa0 && n <= 0xff) || EXTRA_WINANSI.has(c) ? c : "?";
    })
    .join("");
}

function partir(texto: string, fuente: PDFFont, tam: number, ancho: number): string[] {
  const lineas: string[] = [];
  let actual = "";
  for (const palabra of texto.split(/\s+/).filter(Boolean)) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (actual && fuente.widthOfTextAtSize(prueba, tam) > ancho) {
      lineas.push(actual);
      actual = palabra;
    } else {
      actual = prueba;
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

/** La carta en PDF, A4, con el destinatario donde cae la ventana de un sobre americano. */
export async function pdfCarta(c: Carta): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(paraWinAnsi(c.asunto));
  const pagina: PDFPage = doc.addPage([595.28, 841.89]);
  const normal = await doc.embedFont(StandardFonts.Helvetica);
  const negrita = await doc.embedFont(StandardFonts.HelveticaBold);
  const margen = 70;
  const ancho = 595.28 - margen * 2;
  const gris = rgb(0.4, 0.45, 0.5);

  const escribir = (texto: string, x: number, y: number, o: { fuente?: PDFFont; tam?: number; color?: ReturnType<typeof rgb> } = {}) =>
    pagina.drawText(paraWinAnsi(texto), { x, y, font: o.fuente ?? normal, size: o.tam ?? 11, color: o.color ?? rgb(0.1, 0.1, 0.12) });

  let y = 790;
  for (const l of c.remitente) {
    escribir(l, margen, y, { tam: 9, color: gris });
    y -= 12;
  }

  y = 690;
  for (const l of c.destinatario) {
    for (const trozo of partir(paraWinAnsi(l), normal, 11, 220)) {
      escribir(trozo, 320, y);
      y -= 15;
    }
  }

  y = Math.min(y, 600) - 20;
  escribir(c.lugarYFecha, margen, y);
  y -= 30;
  escribir(c.asunto, margen, y, { fuente: negrita });
  y -= 28;
  for (const parrafo of c.cuerpo) {
    for (const linea of partir(paraWinAnsi(parrafo), normal, 11, ancho)) {
      escribir(linea, margen, y);
      y -= 16;
    }
    y -= 8;
  }
  y -= 6;
  for (const l of c.firma) {
    if (l) escribir(l, margen, y);
    y -= 15;
  }

  const pie = partir(paraWinAnsi(c.pie), normal, 7.5, ancho);
  let yPie = 40 + pie.length * 10;
  for (const linea of pie) {
    escribir(linea, margen, yPie, { tam: 7.5, color: gris });
    yPie -= 10;
  }

  return doc.save();
}
