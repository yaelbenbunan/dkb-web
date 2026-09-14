import { describe, expect, test } from "vitest";
import { renderCampaignEmail } from "../campaign-render";
import { blocksSchema, newBlock, DEFAULT_STYLE, type Block } from "../campaign-blocks";

const ctx = { unsubscribeUrl: "https://www.dinkbit.es/api/unsubscribe?token=T" };
const footer: Block = { id: "f", type: "footer", props: { orgLine: "dinkbit", unsubscribe: true } };
const render = (blocks: Block[]) => renderCampaignEmail([...blocks, footer], DEFAULT_STYLE, ctx);

describe("alineación por bloque", () => {
  test("cada bloque lleva su propia alineación al HTML", () => {
    const { html } = render([
      { id: "1", type: "paragraph", props: { text: "izquierda", align: "left" } },
      { id: "2", type: "paragraph", props: { text: "centro", align: "center" } },
      { id: "3", type: "paragraph", props: { text: "derecha", align: "right" } },
      { id: "4", type: "paragraph", props: { text: "justificado", align: "justify" } },
    ]);
    for (const a of ["left", "center", "right", "justify"]) {
      expect(html).toContain(`text-align:${a}`);
    }
  });

  test("el hero, la checklist, el botón y la imagen también se alinean", () => {
    const { html } = render([
      { id: "1", type: "hero", props: { title: "T", align: "right" } },
      { id: "2", type: "checklist", props: { items: ["a"], align: "center" } },
      { id: "3", type: "button", props: { label: "B", url: "https://x.com", align: "left" } },
      { id: "4", type: "image", props: { src: "https://x.com/a.png", align: "right" } },
    ]);
    expect(html.match(/text-align:right/g)?.length).toBeGreaterThanOrEqual(2);
    expect(html).toContain("text-align:center");
    expect(html).toContain("text-align:left");
  });

  test("sin alineación explícita, el botón sigue centrado y el párrafo a la izquierda", () => {
    const { html } = render([
      { id: "1", type: "paragraph", props: { text: "p" } },
      { id: "2", type: "button", props: { label: "B", url: "https://x.com" } },
    ]);
    expect(html).toContain("text-align:left");
    expect(html).toContain("text-align:center");
  });
});

describe("texto enriquecido en párrafo y hero", () => {
  test("el HTML del párrafo se respeta cuando es formato permitido", () => {
    const { html, text } = render([
      {
        id: "1",
        type: "paragraph",
        props: { text: "Oferta hasta el viernes", html: 'Oferta <b>hasta el <span style="color:#ff0000">viernes</span></b>' },
      },
    ]);
    expect(html).toContain("<b>hasta el ");
    expect(html).toContain('<span style="color:#ff0000">viernes</span>');
    expect(text).toContain("Oferta hasta el viernes");
  });

  test("el HTML del párrafo se sanea igual que todo lo demás", () => {
    const { html } = render([
      {
        id: "1",
        type: "paragraph",
        props: { text: "x", html: '<script>alert(1)</script><b>bien</b><img src=x onerror=alert(1)>' },
      },
    ]);
    expect(html).not.toContain("<script");
    expect(html).not.toContain("onerror");
    expect(html).toContain("<b>bien</b>");
  });

  test("sin html, el texto plano se sigue escapando", () => {
    const { html } = render([
      { id: "1", type: "paragraph", props: { text: "<b>no soy negrita</b>" } },
    ]);
    expect(html).toContain("&lt;b&gt;");
    expect(html).not.toContain("<b>no soy negrita</b>");
  });

  test("el cuerpo del hero admite formato enriquecido", () => {
    const { html } = render([
      { id: "1", type: "hero", props: { title: "T", body: "plano", bodyHtml: "<b>rico</b>" } },
    ]);
    expect(html).toContain("<b>rico</b>");
  });

  test("un enlace dentro del texto sobrevive; uno con javascript: no", () => {
    const { html } = render([
      { id: "1", type: "paragraph", props: { text: "x", html: '<a href="https://dinkbit.es">web</a>' } },
      { id: "2", type: "paragraph", props: { text: "y", html: '<a href="javascript:alert(1)">malo</a>' } },
    ]);
    expect(html).toContain('href="https://dinkbit.es"');
    expect(html).not.toContain("javascript:");
    expect(html).toContain("malo");
  });
});

describe("bloque textbox — caja independiente", () => {
  test("se renderiza con su fondo, su borde y su texto enriquecido", () => {
    const { html, text } = render([
      {
        id: "1",
        type: "textbox",
        props: {
          html: "<b>Aviso</b> importante",
          background: "#fff7ed",
          borderColor: "#fdba74",
          align: "center",
        },
      },
    ]);
    expect(html).toContain("#fff7ed");
    expect(html).toContain("#fdba74");
    expect(html).toContain("<b>Aviso</b> importante");
    expect(html).toContain("text-align:center");
    expect(text).toContain("Aviso importante");
  });

  test("un color inventado no se cuela en el CSS", () => {
    const { html } = render([
      {
        id: "1",
        type: "textbox",
        props: { html: "x", background: "red;position:fixed", borderColor: "#000000" },
      },
    ]);
    expect(html).not.toContain("position:fixed");
  });

  test("newBlock('textbox') genera un bloque válido", () => {
    const b = newBlock("textbox");
    expect(b.type).toBe("textbox");
    expect(blocksSchema.safeParse([b]).success).toBe(true);
  });
});

describe("imagen con tamaño", () => {
  test("el porcentaje se traduce a un ancho en píxeles sobre el ancho útil del email", () => {
    const { html } = render([
      { id: "1", type: "image", props: { src: "https://x.com/a.png", width: { unit: "pct", value: 50 } } },
    ]);
    // El contenido útil son 528px (600 menos los 36 de padding a cada lado).
    expect(html).toContain('width="264"');
    expect(html).toContain("width:264px");
  });

  test("el ancho en píxeles se respeta, pero nunca se pasa del ancho útil", () => {
    const { html } = render([
      { id: "1", type: "image", props: { src: "https://x.com/a.png", width: { unit: "px", value: 300 } } },
    ]);
    expect(html).toContain('width="300"');

    const { html: wide } = render([
      { id: "2", type: "image", props: { src: "https://x.com/b.png", width: { unit: "px", value: 5000 } } },
    ]);
    expect(wide).toContain('width="528"');
  });

  test("sin ancho declarado, la imagen se deja fluida", () => {
    const { html } = render([
      { id: "1", type: "image", props: { src: "https://x.com/a.png", alt: "Logo" } },
    ]);
    expect(html).toContain("max-width:100%");
    expect(html).toContain('alt="Logo"');
  });

  test("el src se sigue saneando", () => {
    const { html } = render([
      { id: "1", type: "image", props: { src: "https://x.com/a.png" } },
    ]);
    expect(html).toContain("https://x.com/a.png");
  });
});

describe("compatibilidad con campañas ya guardadas", () => {
  test("bloques sin ninguna de las props nuevas siguen validando y renderizando", () => {
    const viejos = [
      { id: "a", type: "hero", props: { title: "Hola", body: "Cuerpo" } },
      { id: "b", type: "paragraph", props: { text: "Texto", align: "center", size: "lg" } },
      { id: "c", type: "checklist", props: { items: ["uno", "dos"] } },
      { id: "d", type: "button", props: { label: "Ir", url: "https://x.com" } },
      { id: "e", type: "image", props: { src: "https://x.com/a.png" } },
      { id: "g", type: "divider", props: {} },
      { id: "f", type: "footer", props: { orgLine: "dinkbit", unsubscribe: true } },
    ];
    const parsed = blocksSchema.safeParse(viejos);
    expect(parsed.success).toBe(true);
    const { html } = renderCampaignEmail(parsed.data!, DEFAULT_STYLE, ctx);
    expect(html).toContain("Hola");
    expect(html).toContain("Texto");
  });
});

describe("estilos independientes dentro del hero", () => {
  test("título, eyebrow y bajada llevan cada uno su propio CSS inline", () => {
    const { html } = render([
      {
        id: "h",
        type: "hero",
        props: {
          eyebrow: "NOVEDAD",
          title: "Titular",
          body: "Bajada",
          eyebrowStyle: { color: "#ff0000", size: 11 },
          titleStyle: { size: 40, align: "center", underline: true },
          bodyStyle: { color: "#123456", size: 15, align: "justify", italic: true },
        },
      },
    ]);
    expect(html).toContain("color:#ff0000");
    expect(html).toContain("font-size:11px");
    expect(html).toContain("font-size:40px");
    expect(html).toContain("text-decoration:underline");
    expect(html).toContain("color:#123456");
    expect(html).toContain("font-size:15px");
    expect(html).toContain("font-style:italic");
  });

  test("tocar el título no arrastra a la bajada", () => {
    const { html } = render([
      {
        id: "h",
        type: "hero",
        props: {
          title: "Titular",
          body: "Bajada",
          titleStyle: { color: "#ff0000", align: "right" },
        },
      },
    ]);
    const title = /<h1[^>]*style="([^"]*)"/.exec(html)?.[1] ?? "";
    const body = /<p style="margin:14px 0 0;([^"]*)"/.exec(html)?.[1] ?? "";
    expect(title).toContain("color:#ff0000");
    expect(title).toContain("text-align:right");
    expect(body).toContain("color:#475569");
    expect(body).toContain("text-align:left");
  });

  test("negrita y cursiva salen como CSS inline, que es lo que entiende Outlook", () => {
    const { html } = render([
      { id: "h", type: "hero", props: { title: "T", titleStyle: { bold: false }, bodyStyle: { bold: true }, body: "B" } },
    ]);
    expect(html).toContain("font-weight:400");
    expect(html).toContain("font-weight:700");
  });

  test("el hero puede llevar su propio botón, con enlace y texto seguros", () => {
    const { html, text } = render([
      {
        id: "h",
        type: "hero",
        props: {
          title: "T",
          cta: { label: "Reservar", url: "https://dinkbit.es/reserva", background: "#00aa55", style: { size: 18, align: "center" } },
        },
      },
    ]);
    expect(html).toContain('href="https://dinkbit.es/reserva"');
    expect(html).toContain("background:#00aa55");
    expect(html).toContain("font-size:18px");
    expect(html).toContain("Reservar");
    expect(text).toContain("Reservar: https://dinkbit.es/reserva");
  });

  test("un hero sin estilos se sigue pintando como siempre", () => {
    const { html } = render([{ id: "h", type: "hero", props: { title: "T", body: "B" } }]);
    expect(html).toContain("font-size:28px");
    expect(html).toContain("color:#0f172a");
    expect(html).toContain("color:#475569");
  });
});

describe("espaciado entre secciones", () => {
  test("con spacing 0 las secciones quedan pegadas (padding vertical 0)", () => {
    const { html } = render([
      { id: "1", type: "paragraph", props: { text: "a" }, spacing: 0 },
      { id: "2", type: "paragraph", props: { text: "b" }, spacing: 0 },
    ]);
    expect(html).toContain("padding:0px 36px 0px");
  });

  test("el valor se reparte mitad arriba y mitad abajo de cada sección", () => {
    const { html } = render([{ id: "1", type: "paragraph", props: { text: "a" }, spacing: 40 }]);
    expect(html).toContain("padding:20px 36px 20px");
  });

  test("el espaciado se aplica con padding de celda, no con márgenes", () => {
    const { html } = render([{ id: "1", type: "button", props: { label: "B", url: "https://x.com" }, spacing: 30 }]);
    expect(html).toContain('<td style="padding:15px 36px 15px');
  });

  test("un bloque sin spacing conserva el padding de toda la vida", () => {
    const { html } = render([{ id: "1", type: "paragraph", props: { text: "a" } }]);
    expect(html).toContain("padding:10px 36px 10px");
  });
});
