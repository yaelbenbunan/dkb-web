import { describe, expect, test } from "vitest";
import { renderBrandedEmail } from "../email-layout";

const base = {
  eyebrow: "Contacto",
  heading: "Hemos recibido tu solicitud",
  intro: "Gracias por escribirnos.",
};

describe("renderBrandedEmail", () => {
  test("devuelve html y texto plano con el asunto intacto", () => {
    const { subject, html, text } = renderBrandedEmail({
      ...base,
      subject: "Gracias por escribirnos",
    });
    expect(subject).toBe("Gracias por escribirnos");
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("Hemos recibido tu solicitud");
    expect(text).toContain("Hemos recibido tu solicitud");
    // El texto plano no debe arrastrar etiquetas.
    expect(text).not.toContain("<");
  });

  test("saluda por el nombre de pila y cae a un saludo genérico sin nombre", () => {
    const conNombre = renderBrandedEmail({ ...base, subject: "s", name: "Ana María Rodríguez" });
    expect(conNombre.html).toContain("Ana");
    expect(conNombre.html).not.toContain("Rodríguez");

    const sinNombre = renderBrandedEmail({ ...base, subject: "s" });
    expect(sinNombre.html).toContain("Hola");
  });

  test("escapa el HTML del nombre y del contenido (anti-inyección)", () => {
    const { html } = renderBrandedEmail({
      ...base,
      subject: "s",
      name: "<script>alert(1)</script>",
      intro: "<img src=x onerror=alert(1)>",
    });
    // Lo que importa es que no quede markup vivo: escapado, el texto es inerte.
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;img");
  });

  test("las viñetas son opcionales y aparecen en html y texto", () => {
    const sin = renderBrandedEmail({ ...base, subject: "s" });
    expect(sin.html).not.toContain("Qué pasa ahora");

    const con = renderBrandedEmail({
      ...base,
      subject: "s",
      bulletsLabel: "Qué pasa ahora",
      bullets: ["Revisamos tu solicitud", "Te llamamos en 24 h"],
    });
    expect(con.html).toContain("Qué pasa ahora");
    expect(con.html).toContain("Te llamamos en 24 h");
    expect(con.text).toContain("· Te llamamos en 24 h");
  });

  test("el CTA es opcional y solo admite http/https", () => {
    // El pie siempre lleva su enlace, así que la señal del CTA es su copy.
    const sin = renderBrandedEmail({ ...base, subject: "s" });
    expect(sin.html).not.toContain("O responde a este correo");

    const con = renderBrandedEmail({
      ...base,
      subject: "s",
      cta: { label: "Ver mi presupuesto", url: "https://www.dinkbit.es/x" },
    });
    expect(con.html).toContain('href="https://www.dinkbit.es/x"');
    expect(con.text).toContain("https://www.dinkbit.es/x");

    const malicioso = renderBrandedEmail({
      ...base,
      subject: "s",
      cta: { label: "x", url: "javascript:alert(1)" },
    });
    expect(malicioso.html).not.toContain("javascript:");
    // Con una URL no válida, el botón se omite entero en vez de renderizarse roto.
    expect(malicioso.html).not.toContain("O responde a este correo");
  });

  test("incluye el preheader oculto y el pie de dinkbit", () => {
    const { html } = renderBrandedEmail({
      ...base,
      subject: "s",
      preheader: "Resumen breve del correo",
    });
    expect(html).toContain("Resumen breve del correo");
    expect(html).toContain("www.dinkbit.es");
  });

  test("los marcadores **así** salen en negrita en html y limpios en texto", () => {
    const { html, text } = renderBrandedEmail({
      ...base,
      subject: "s",
      intro: "te llamamos **en menos de 24 horas** laborables.",
    });
    expect(html).toContain("<strong>en menos de 24 horas</strong>");
    expect(text).toContain("en menos de 24 horas laborables.");
    expect(text).not.toContain("**");
  });

  test("el escapado ocurre antes que la negrita: no se puede colar markup", () => {
    const { html } = renderBrandedEmail({
      ...base,
      subject: "s",
      intro: "**<script>alert(1)</script>**",
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("<strong>&lt;script&gt;");
  });
});

describe("tema de growth", () => {
  const growth = () =>
    renderBrandedEmail({ ...base, subject: "s", theme: "growth", cta: { label: "WhatsApp", url: "https://wa.me/34600" } });

  test("pinta la paleta clara de la landing, no la azul de dinkbit", () => {
    const { html } = growth();
    expect(html).toContain("#F2F8F8"); // fondo
    expect(html).toContain("#0A7C7E"); // acento turquesa oscuro
    expect(html).not.toContain("#187bef"); // el azul de dinkbit no pinta aquí
  });

  test("es claro y turquesa: ni fondo casi negro ni lima", () => {
    const { html } = growth();
    expect(html).not.toContain("#08090C");
    expect(html).not.toContain("#C7F73E");
    expect(html).toContain('name="color-scheme" content="light"');
  });

  test("lleva el rótulo de Growth, no el logo azul de dinkbit", () => {
    const { html } = growth();
    expect(html).not.toContain("dinkbit-email.png");
    expect(html).toContain("Growth");
    expect(html).toContain("by dinkbit");
  });

  test("el botón lleva texto blanco sobre el turquesa oscuro", () => {
    const { html } = growth();
    const boton = html.slice(html.indexOf("https://wa.me/34600"));
    expect(boton).toContain("#ffffff");
  });

  test("sin tema, los demás correos siguen siendo los de dinkbit", () => {
    const { html } = renderBrandedEmail({ ...base, subject: "s" });
    expect(html).toContain("#187bef");
    expect(html).toContain("dinkbit-email.png");
    expect(html).not.toContain("#C7F73E");
  });
});
