import { describe, expect, test } from "vitest";
import { leerSolicitud, notaSolicitudPack, PD_BADGE, PD_PRECIO, PD_PRECIO_SUFIJO } from "../proveedores-deportivos";

function fd(extra: Record<string, string | string[]> = {}) {
  const base: Record<string, string | string[]> = {
    nombre: "Laura Gómez",
    empresa: "Padel Pro SL",
    web: "@padelpro",
    email: "laura@padelpro.es",
    telefono: "600 11 22 33",
    producto: "padel",
    destinos: ["clubes_padel", "gimnasios"],
    facturacion: "100k_500k",
    muestras: "si",
    presupuesto: "500_1500",
    privacidad: "on",
    ...extra,
  };
  const f = new FormData();
  for (const [k, v] of Object.entries(base)) (Array.isArray(v) ? v : [v]).forEach((x) => f.append(k, x));
  return f;
}

describe("leerSolicitud", () => {
  test("un envío completo es válido y conserva los chips", () => {
    const r = leerSolicitud(fd());
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.datos.destinos).toEqual(["clubes_padel", "gimnasios"]);
  });

  test("teléfono con +34 y espacios vale; con 8 dígitos o letras no", () => {
    expect(leerSolicitud(fd({ telefono: "+34 600 11 22 33" })).ok).toBe(true);
    const corto = leerSolicitud(fd({ telefono: "6001122" }));
    expect(corto.ok === false && corto.errores.telefono).toBeTruthy();
    const letras = leerSolicitud(fd({ telefono: "600abc223" }));
    expect(letras.ok === false && letras.errores.telefono).toBeTruthy();
  });

  test("exige al menos un destino y la privacidad", () => {
    const r = leerSolicitud(fd({ destinos: [], privacidad: "" }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errores.destinos).toBeTruthy();
      expect(r.errores.privacidad).toBeTruthy();
    }
  });

  test("rechaza valores fuera del catálogo", () => {
    const r = leerSolicitud(fd({ producto: "coches", facturacion: "infinito", destinos: ["marte"] }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errores.producto).toBeTruthy();
      expect(r.errores.facturacion).toBeTruthy();
      expect(r.errores.destinos).toBeTruthy();
    }
  });

  test("email y campos de texto obligatorios", () => {
    const r = leerSolicitud(fd({ email: "no-es-email", empresa: " ", web: "" }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errores.email).toBeTruthy();
      expect(r.errores.empresa).toBeTruthy();
      expect(r.errores.web).toBeTruthy();
    }
  });
});

describe("notaSolicitudPack", () => {
  test("una línea por respuesta con etiquetas legibles", () => {
    const r = leerSolicitud(fd());
    if (!r.ok) throw new Error("debería ser válida");
    expect(notaSolicitudPack(r.datos)).toBe(
      [
        "Desde la landing de proveedores deportivos (Pack Campaña + CRM).",
        "Web / Instagram: @padelpro",
        "Qué vende: Material de pádel",
        "A quién quiere vender: Clubes de pádel, Gimnasios",
        "Facturación anual: 100k–500k€",
        "Muestras gratuitas: Sí",
        "Presupuesto mensual en publicidad: 500–1.500€",
      ].join("\n"),
    );
  });
});

test("el precio se escribe igual en todas partes", () => {
  expect(PD_BADGE).toContain(PD_PRECIO);
  expect(PD_BADGE).toContain(PD_PRECIO_SUFIJO.toUpperCase());
});
