import { describe, expect, test } from "vitest";
import {
  inicioDelDiaMadrid,
  limiteDiario,
  motivoBloqueo,
  remitentesProspeccion,
} from "../reglas-envio";

const ctx = { suprimidos: new Set<string>(), emailsDeLeads: new Set<string>(), confirmarPersonal: false };
const listo = { status: "listo", email: "info@bar.es", email_kind: "generica" } as const;

describe("motivoBloqueo", () => {
  test("un prospecto listo con buzón genérico se puede enviar", () => {
    expect(motivoBloqueo(listo, ctx)).toBeNull();
  });

  test("solo se envía desde «listo»", () => {
    for (const status of ["nuevo", "sin_contacto", "enviado", "respondido", "rebotado", "baja", "descartado"] as const) {
      expect(motivoBloqueo({ ...listo, status }, ctx)).toBe("estado");
    }
  });

  test("sin email no hay envío", () => {
    expect(motivoBloqueo({ ...listo, email: " " }, ctx)).toBe("sin_email");
  });

  test("respeta la supresión por email y por dominio, sin distinguir mayúsculas", () => {
    expect(motivoBloqueo({ ...listo, email: "Info@Bar.es" }, { ...ctx, suprimidos: new Set(["info@bar.es"]) })).toBe("suprimido");
    expect(motivoBloqueo(listo, { ...ctx, suprimidos: new Set(["bar.es"]) })).toBe("suprimido");
  });

  test("no escribe a quien ya es lead del CRM", () => {
    expect(motivoBloqueo(listo, { ...ctx, emailsDeLeads: new Set(["info@bar.es"]) })).toBe("ya_es_lead");
  });

  test("una dirección personal exige confirmación", () => {
    const personal = { ...listo, email: "juan@bar.es", email_kind: "personal" } as const;
    expect(motivoBloqueo(personal, ctx)).toBe("personal_sin_confirmar");
    expect(motivoBloqueo(personal, { ...ctx, confirmarPersonal: true })).toBeNull();
  });
});

describe("limiteDiario", () => {
  test("30 por defecto, y también si la variable no es un número válido", () => {
    expect(limiteDiario(undefined)).toBe(30);
    expect(limiteDiario("abc")).toBe(30);
    expect(limiteDiario("-5")).toBe(30);
  });
  test("acepta el valor configurado, incluido 0 para parar los envíos", () => {
    expect(limiteDiario("50")).toBe(50);
    expect(limiteDiario("0")).toBe(0);
  });
});

describe("remitentesProspeccion", () => {
  test("lista vacía si no está configurada: no hay remitente por defecto", () => {
    expect(remitentesProspeccion(undefined)).toEqual([]);
    expect(remitentesProspeccion(" ")).toEqual([]);
  });
  test("separa por comas y limpia", () => {
    expect(remitentesProspeccion(" Hola@mail.dinkbit.es , paula@mail.dinkbit.es")).toEqual([
      "hola@mail.dinkbit.es",
      "paula@mail.dinkbit.es",
    ]);
  });
});

describe("inicioDelDiaMadrid", () => {
  test("en verano la medianoche de Madrid son las 22:00 UTC del día anterior", () => {
    expect(inicioDelDiaMadrid(new Date("2026-10-07T10:00:00Z")).toISOString()).toBe("2026-10-06T22:00:00.000Z");
  });
  test("las 00:30 de Madrid ya son del día nuevo", () => {
    expect(inicioDelDiaMadrid(new Date("2026-10-06T22:30:00Z")).toISOString()).toBe("2026-10-06T22:00:00.000Z");
  });
  test("las 23:59 de Madrid siguen siendo del día anterior", () => {
    expect(inicioDelDiaMadrid(new Date("2026-10-06T21:59:00Z")).toISOString()).toBe("2026-10-05T22:00:00.000Z");
  });
  test("en invierno la medianoche de Madrid son las 23:00 UTC", () => {
    expect(inicioDelDiaMadrid(new Date("2026-12-10T12:00:00Z")).toISOString()).toBe("2026-12-09T23:00:00.000Z");
  });
});
