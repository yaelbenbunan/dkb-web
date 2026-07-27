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
  test("la url del botón se sanea (solo http/https)", () => {
    const { html } = renderCampaignEmail([
      { id: "1", type: "button", props: { label: "x", url: "javascript:alert(1)" } },
      { id: "f", type: "footer", props: { orgLine: "d", unsubscribe: true } },
    ], DEFAULT_STYLE, ctx);
    expect(html).not.toContain("javascript:");
  });
});
