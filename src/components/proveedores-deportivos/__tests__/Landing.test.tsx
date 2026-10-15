import { render } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

vi.mock("@/lib/proveedores-deportivos-action", () => ({ enviarSolicitudPack: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { LandingProveedoresDeportivos } from "../Secciones";
import { PD_FAQS, PD_PRECIO, PD_PRECIO_SUFIJO } from "@/lib/proveedores-deportivos";

describe("LandingProveedoresDeportivos", () => {
  test("el precio aparece con su sufijo en badge, bullets, tarjeta y CTA final", () => {
    const { container } = render(<LandingProveedoresDeportivos />);
    const texto = container.textContent!;
    const veces = texto.split(PD_PRECIO).length - 1;
    expect(veces).toBeGreaterThanOrEqual(4);
    expect(texto).toContain(PD_PRECIO_SUFIJO);
    expect(texto).not.toMatch(/\[\/mes\]/);
  });

  test("los datos que no tenemos se ven como placeholder y no se inventan", () => {
    const { container } = render(<LandingProveedoresDeportivos />);
    const huecos = [...container.querySelectorAll("[data-placeholder]")].map((n) => n.textContent);
    expect(huecos).toEqual(expect.arrayContaining(["[TESTIMONIO REAL]", "[LOGO CLIENTE]", "[RESULTADO]", "[X]"]));
    const faqsSinRespuesta = PD_FAQS.filter((f) => f.a === null).length;
    expect(huecos.filter((h) => h === "[PLACEHOLDER]").length).toBe(faqsSinRespuesta);
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
});
