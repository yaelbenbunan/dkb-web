import { describe, expect, test } from "vitest";
import {
  construirRecordatorio,
  esDestinatariaRecordatorio,
  pendientesDelDia,
  tocaRecordatorio,
  type SeguimientoPendiente,
  type TareaPendiente,
} from "../ventas/recordatorio-diario";

const AHORA = { fecha: "2026-10-15", hora: "08:05" };

function seg(p: Partial<SeguimientoPendiente> = {}): SeguimientoPendiente {
  return {
    id: "l1",
    negocio: "Gym Sol",
    telefono: "600111222",
    fase: "contactado",
    proximo_seguimiento: "2026-10-15",
    proximo_seguimiento_hora: null,
    marca: { nombre: "Hydrup", slug: "hydrup" },
    ...p,
  };
}

function tarea(p: Partial<TareaPendiente> = {}): TareaPendiente {
  return { id: "t1", titulo: "Enviar presupuesto", vence: "2026-10-15", vence_hora: null, notas: null, marca: { nombre: "Hydrup", slug: "hydrup" }, ...p };
}

describe("tocaRecordatorio", () => {
  // 2026-10-15 es jueves; en octubre Madrid va en UTC+2 hasta el día 25.
  test("de lunes a viernes, de 8:00 a 12:00 hora de Madrid", () => {
    expect(tocaRecordatorio(new Date("2026-10-15T05:59:00Z"))).toBe(false); // 07:59
    expect(tocaRecordatorio(new Date("2026-10-15T06:00:00Z"))).toBe(true); // 08:00
    expect(tocaRecordatorio(new Date("2026-10-15T09:59:00Z"))).toBe(true); // 11:59
    expect(tocaRecordatorio(new Date("2026-10-15T10:00:00Z"))).toBe(false); // 12:00
  });

  test("ni sábado ni domingo", () => {
    expect(tocaRecordatorio(new Date("2026-10-17T07:00:00Z"))).toBe(false);
    expect(tocaRecordatorio(new Date("2026-10-18T07:00:00Z"))).toBe(false);
  });

  test("con el horario de invierno sigue siendo a las 8:00 de Madrid", () => {
    // 2026-11-02 es lunes; Madrid va en UTC+1.
    expect(tocaRecordatorio(new Date("2026-11-02T06:30:00Z"))).toBe(false); // 07:30
    expect(tocaRecordatorio(new Date("2026-11-02T07:00:00Z"))).toBe(true); // 08:00
  });

  test("el día lo marca Madrid, no UTC", () => {
    // Domingo 23:30 UTC ya es lunes 01:30 en Madrid, pero fuera de horario.
    expect(tocaRecordatorio(new Date("2026-10-18T23:30:00Z"))).toBe(false);
  });
});

describe("esDestinatariaRecordatorio", () => {
  test("todas las activas, también las comerciales; las desactivadas no", () => {
    expect(esDestinatariaRecordatorio({ rol: "admin", activa: true })).toBe(true);
    expect(esDestinatariaRecordatorio({ rol: "cliente", activa: true })).toBe(true);
    expect(esDestinatariaRecordatorio({ rol: "comercial", activa: true })).toBe(true);
    expect(esDestinatariaRecordatorio({ rol: "comercial", activa: false })).toBe(false);
  });
});

describe("pendientesDelDia", () => {
  test("separa atrasados y de hoy, y deja fuera lo futuro", () => {
    const p = pendientesDelDia(
      [seg({ id: "a", proximo_seguimiento: "2026-10-14" }), seg({ id: "b" }), seg({ id: "c", proximo_seguimiento: "2026-10-16" })],
      [tarea({ id: "x", vence: "2026-10-10" }), tarea({ id: "y" }), tarea({ id: "z", vence: "2026-10-20" })],
      AHORA,
    );
    expect(p.seguimientosAtrasados.map((l) => l.id)).toEqual(["a"]);
    expect(p.seguimientosHoy.map((l) => l.id)).toEqual(["b"]);
    expect(p.tareas.map(({ t, estado }) => [t.id, estado])).toEqual([
      ["x", "atrasado"],
      ["y", "hoy"],
    ]);
  });

  test("un lead en fase no activa no cuenta aunque tenga fecha", () => {
    const p = pendientesDelDia([seg({ fase: "perdido" })], [], AHORA);
    expect(p.seguimientosAtrasados).toEqual([]);
    expect(p.seguimientosHoy).toEqual([]);
  });

  test("la hora cuenta: una cita de hoy ya pasada está atrasada", () => {
    const p = pendientesDelDia([seg({ proximo_seguimiento_hora: "08:00:00" })], [], AHORA);
    expect(p.seguimientosAtrasados).toHaveLength(1);
  });
});

describe("construirRecordatorio", () => {
  const admin = { nombre: "Yael Benbunan", rol: "admin" as const };

  test("sin nada pendiente no hay correo", () => {
    expect(construirRecordatorio(admin, pendientesDelDia([], [], AHORA), AHORA, null)).toBeNull();
  });

  test("agrupa por proyecto y cuenta el total en el asunto", () => {
    const p = pendientesDelDia(
      [seg({ id: "a", proximo_seguimiento: "2026-10-14" }), seg({ id: "b", negocio: "Dental Mar", marca: { nombre: "Dinkbit", slug: "dinkbit" } })],
      [tarea()],
      AHORA,
    );
    const c = construirRecordatorio(admin, p, AHORA, null)!;
    expect(c.subject).toBe("Tienes 3 pendientes hoy");
    expect(c.text).toContain("Hydrup");
    expect(c.text).toContain("Dinkbit");
    expect(c.text.indexOf("Dinkbit")).toBeLessThan(c.text.indexOf("Hydrup")); // por nombre
    expect(c.text).toContain("Llamar a Gym Sol");
    expect(c.text).toContain("Enviar presupuesto");
    expect(c.html).toContain("https://www.dinkbit.es/panel/ventas/hoy");
    expect(c.text).toContain("Hola Yael");
  });

  test("en singular con un solo pendiente", () => {
    const c = construirRecordatorio(admin, pendientesDelDia([seg()], [], AHORA), AHORA, null)!;
    expect(c.subject).toBe("Tienes 1 pendiente hoy");
  });

  test("a una clienta la lleva a las tareas de su marca, no a «Mi día»", () => {
    const c = construirRecordatorio({ nombre: "Ana", rol: "cliente" }, pendientesDelDia([], [tarea()], AHORA), AHORA, "hydrup")!;
    expect(c.html).toContain("https://www.dinkbit.es/panel/ventas/hydrup/tareas?de=yo");
    expect(c.html).not.toContain("/panel/ventas/hoy");
  });

  test("escapa lo que escriben las usuarias", () => {
    const c = construirRecordatorio(admin, pendientesDelDia([], [tarea({ titulo: "<b>ojo</b> & co" })], AHORA), AHORA, null)!;
    expect(c.html).toContain("&lt;b&gt;ojo&lt;/b&gt; &amp; co");
    expect(c.html).not.toContain("<b>ojo</b>");
  });

  test("muestra la hora y marca lo atrasado", () => {
    const p = pendientesDelDia([seg({ proximo_seguimiento: "2026-10-13", proximo_seguimiento_hora: "16:30:00" })], [], AHORA);
    const c = construirRecordatorio(admin, p, AHORA, null)!;
    expect(c.text).toContain("13/10/2026 · 16:30");
    expect(c.text).toContain("Atrasado");
  });
});
