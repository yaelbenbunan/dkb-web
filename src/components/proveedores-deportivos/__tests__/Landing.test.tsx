import { render } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

vi.mock("@/lib/proveedores-deportivos-action", () => ({ enviarSolicitudPack: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { LandingProveedoresDeportivos } from "../Secciones";
import { PD_FAQS_RESPONDIDAS, PD_META_DESCRIPTION, PD_META_TITLE, PD_PRECIO, PD_PRECIO_SUFIJO } from "@/lib/proveedores-deportivos";

describe("LandingProveedoresDeportivos", () => {
  test("el precio aparece con su sufijo en badge, tarjeta y CTA final, no en los bullets", () => {
    const { container } = render(<LandingProveedoresDeportivos />);
    const texto = container.textContent!;
    const veces = texto.split(PD_PRECIO).length - 1;
    expect(veces).toBeGreaterThanOrEqual(3);
    expect(container.querySelector("ul")!.textContent).not.toContain(PD_PRECIO);
    expect(texto).toContain(PD_PRECIO_SUFIJO);
    expect(texto).not.toMatch(/\[\/mes\]/);
  });

  test("no se publica ningún placeholder: sin cifras ni casos reales, esas secciones no salen", () => {
    const { container } = render(<LandingProveedoresDeportivos />);
    expect(container.querySelector("[data-placeholder]")).toBeNull();
    expect(container.textContent).not.toMatch(/\[[^\]]*\]/);
    expect(container.textContent).not.toContain("Proveedores que ya venden así");
    expect(container.textContent).not.toContain("muestras enviadas");
  });

  test("la FAQ solo enseña las preguntas con respuesta", () => {
    const { container } = render(<LandingProveedoresDeportivos />);
    expect(container.querySelectorAll("details").length).toBe(PD_FAQS_RESPONDIDAS.length);
  });

  test("el titular es corto y el CTA final lo repite, con un solo botón", () => {
    const { container } = render(<LandingProveedoresDeportivos />);
    const h1 = container.querySelector("h1")!.textContent!;
    expect(h1.split(/\s+/).length).toBeLessThanOrEqual(8);
    const final = container.querySelector("#cta-final")!;
    expect(final.querySelector("h2")!.textContent).toBe(h1);
    expect(final.querySelectorAll("a").length).toBe(1);
  });

  test("todos los CTA llevan al formulario", () => {
    const { container } = render(<LandingProveedoresDeportivos />);
    expect(container.querySelector("form#solicitud")).not.toBeNull();
    const ctas = [...container.querySelectorAll('a[href="#solicitud"]')];
    expect(ctas.length).toBeGreaterThanOrEqual(2);
  });
});

describe("metadata", () => {
  test("el título no repite «dinkbit» con la plantilla del layout raíz («%s — dinkbit»)", async () => {
    const { metadata } = await import("@/app/(deporte)/proveedores-deportivos/page");
    const gracias = await import("@/app/(deporte)/proveedores-deportivos/gracias/page");
    expect(metadata.title).toEqual({ absolute: "Pack Campaña + CRM para proveedores deportivos | dinkbit" });
    expect(gracias.metadata.title).toBe("Solicitud recibida");
  });

  test("las tarjetas de X son las de esta landing, no las de la home", async () => {
    const { metadata } = await import("@/app/(deporte)/proveedores-deportivos/page");
    expect(metadata.twitter).toMatchObject({ title: PD_META_TITLE, description: PD_META_DESCRIPTION });
    expect((metadata.twitter as { images: unknown }).images).toEqual(metadata.openGraph!.images);
  });
});
