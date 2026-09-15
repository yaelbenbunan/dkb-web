import { describe, expect, test } from "vitest";
import { renderCampaignEmail } from "../campaign-render";
import { DEFAULT_STYLE } from "../campaign-blocks";

const ctx = { preheader: "Hola", unsubscribeUrl: "https://www.dinkbit.es/api/unsubscribe?token=T" };

describe("renderCampaignEmail", () => {
  test("renderiza hero + button + footer con baja", () => {
    const { html, text } = renderCampaignEmail([
      { id: "1", type: "hero", props: { title: "Bienvenido", body: "Cuerpo" } },
      { id: "2", type: "button", props: { label: "Ir", url: "https://x.com" } },
      { id: "3", type: "footer", props: { orgLine: "dinkbit", unsubscribe: true } },
    ], DEFAULT_STYLE, ctx);
    expect(html).toContain("Bienvenido");
    expect(html).toContain("https://x.com");
    expect(html).toContain(ctx.unsubscribeUrl);
    expect(html.toLowerCase()).toContain("baja");
    expect(html).toContain("<table"); // email-safe table-based
    expect(text).toContain("Bienvenido");
  });
  test("escapa HTML del texto (anti-inyección)", () => {
    const { html } = renderCampaignEmail([
      { id: "1", type: "paragraph", props: { text: "<script>alert(1)</script>" } },
      { id: "f", type: "footer", props: { orgLine: "d", unsubscribe: true } },
    ], DEFAULT_STYLE, ctx);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
  test("la url del botón se sanea (bloquea javascript:)", () => {
    const { html } = renderCampaignEmail([
      { id: "1", type: "button", props: { label: "x", url: "javascript:alert(1)" } },
      { id: "f", type: "footer", props: { orgLine: "d", unsubscribe: true } },
    ], DEFAULT_STYLE, ctx);
    expect(html).not.toContain("javascript:");
  });
  test("un botón de llamada conserva el enlace tel:", () => {
    const { html, text } = renderCampaignEmail([
      { id: "1", type: "button", props: { label: "Llámanos", url: "tel:+34657559397" } },
      { id: "f", type: "footer", props: { orgLine: "d", unsubscribe: true } },
    ], DEFAULT_STYLE, ctx);
    expect(html).toContain('href="tel:+34657559397"');
    expect(text).toContain("tel:+34657559397");
  });
  test("un botón de email conserva el enlace mailto:", () => {
    const { html } = renderCampaignEmail([
      { id: "1", type: "button", props: { label: "Escríbenos", url: "mailto:hola@dinkbit.es" } },
      { id: "f", type: "footer", props: { orgLine: "d", unsubscribe: true } },
    ], DEFAULT_STYLE, ctx);
    expect(html).toContain('href="mailto:hola@dinkbit.es"');
  });
  test("una imagen solo admite http/https (tel: no es una fuente válida)", () => {
    const { html } = renderCampaignEmail([
      { id: "1", type: "image", props: { src: "tel:+34657559397" } },
      { id: "f", type: "footer", props: { orgLine: "d", unsubscribe: true } },
    ], DEFAULT_STYLE, ctx);
    expect(html).not.toContain("tel:");
  });
  test("un accent malicioso no rompe el atributo style (hero/button)", () => {
    const malicious = '#fff" onmouseover="alert(1)';
    const { html } = renderCampaignEmail([
      { id: "1", type: "hero", props: { title: "T", accent: malicious } },
      { id: "2", type: "button", props: { label: "x", url: "https://x.com", accent: malicious } },
      { id: "f", type: "footer", props: { orgLine: "d", unsubscribe: true } },
    ], DEFAULT_STYLE, ctx);
    expect(html).not.toContain("onmouseover");
  });
  test("un fontStack malicioso no rompe el <style> ni inyecta <script>", () => {
    const malicious = 'x;} body{} a[href]{color:red}"><script>alert(1)</script>';
    const { html } = renderCampaignEmail([
      { id: "1", type: "paragraph", props: { text: "hola" } },
      { id: "f", type: "footer", props: { orgLine: "d", unsubscribe: true } },
    ], { ...DEFAULT_STYLE, fontStack: malicious }, ctx);
    expect(html).not.toContain("<script>");
    expect(html).not.toContain(malicious);
    expect(html).toContain(DEFAULT_STYLE.fontStack as string);
  });
  test("un image.src con javascript: se sanea", () => {
    const { html } = renderCampaignEmail([
      { id: "1", type: "image", props: { src: "javascript:alert(1)" } },
      { id: "f", type: "footer", props: { orgLine: "d", unsubscribe: true } },
    ], DEFAULT_STYLE, ctx);
    expect(html).not.toContain("javascript:");
  });
  test("checklist escapa HTML de los items", () => {
    const { html } = renderCampaignEmail([
      { id: "1", type: "checklist", props: { items: ["<b>x</b>"] } },
      { id: "f", type: "footer", props: { orgLine: "d", unsubscribe: true } },
    ], DEFAULT_STYLE, ctx);
    expect(html).toContain("&lt;b&gt;");
    expect(html).not.toContain("<b>x</b>");
  });
});

describe("preheader", () => {
  const blocks = [
    { id: "1", type: "hero", props: { title: "Bienvenido a dinkbit", body: "Cuerpo del correo" } },
    { id: "f", type: "footer", props: { orgLine: "d", unsubscribe: true } },
  ] as Parameters<typeof renderCampaignEmail>[0];

  test("pinta el texto previo oculto y con relleno invisible", () => {
    const { html } = renderCampaignEmail(blocks, DEFAULT_STYLE, {
      preheader: "Dos plazas libres en mayo",
      unsubscribeUrl: ctx.unsubscribeUrl,
    });
    expect(html).toContain("Dos plazas libres en mayo");
    expect(html).toContain("display:none!important");
    expect(html).toContain("&#847;");
    // va al principio del body, antes de la tabla del correo
    expect(html.indexOf("Dos plazas")).toBeLessThan(html.indexOf("<table"));
  });

  test("sin texto previo cae a la primera línea del cuerpo, nunca al asunto", () => {
    const { html } = renderCampaignEmail(blocks, DEFAULT_STYLE, {
      preheader: "",
      unsubscribeUrl: ctx.unsubscribeUrl,
    });
    const hidden = html.slice(0, html.indexOf("<table"));
    expect(hidden).toContain("Bienvenido a dinkbit");
  });

  test("el texto previo se escapa", () => {
    const { html } = renderCampaignEmail(blocks, DEFAULT_STYLE, {
      preheader: "<script>alert(1)</script>",
      unsubscribeUrl: ctx.unsubscribeUrl,
    });
    expect(html).not.toContain("<script>alert(1)</script>");
  });
});
