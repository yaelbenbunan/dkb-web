import { describe, expect, test } from "vitest";
import {
  eurosACentimos,
  leerNuevaUsuaria,
  leerPassword,
  leerNuevaMarca,
  leerCondiciones,
  leerExclusion,
  leerDatosLead,
  leerLlamada,
  leerNotaSeguimiento,
  leerCambioFase,
} from "../ventas/validacion";

function fd(campos: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.set(k, v);
  return f;
}

describe("eurosACentimos", () => {
  test("acepta formato español y con símbolo", () => {
    expect(eurosACentimos("1.234,56")).toBe(123456);
    expect(eurosACentimos("12,5 €")).toBe(1250);
    expect(eurosACentimos("12.5")).toBe(1250);
    expect(eurosACentimos("")).toBe(0);
  });

  test("devuelve null si no es un número", () => {
    expect(eurosACentimos("doce")).toBeNull();
  });
});

describe("leerNuevaUsuaria con rol cliente", () => {
  const base = { nombre: "Ana", email: "ana@hydrup.es", password: "1234567890ab" };
  const UUID = "3f0c2a4e-1b2c-4d5e-8f90-123456789abc";

  test("cliente con marca: se guarda la marca", () => {
    expect(leerNuevaUsuaria(fd({ ...base, rol: "cliente", marca_id: UUID }))).toEqual({ ok: true, datos: { ...base, rol: "cliente", marca_id: UUID } });
  });
  test("cliente sin marca: error", () => {
    expect(leerNuevaUsuaria(fd({ ...base, rol: "cliente" }))).toEqual({ ok: false, error: "Elige la marca de la clienta." });
  });
  test("comercial: la marca se ignora aunque venga", () => {
    const r = leerNuevaUsuaria(fd({ ...base, rol: "comercial", marca_id: UUID }));
    expect(r.ok && r.datos.marca_id).toBeNull();
  });
});

describe("leerNuevaUsuaria", () => {
  test("normaliza el email y valida contraseña y rol", () => {
    const ok = leerNuevaUsuaria(fd({ nombre: "Paula", email: " Paula@Dinkbit.com ", password: "1234567890", rol: "comercial" }));
    expect(ok).toEqual({ ok: true, datos: { nombre: "Paula", email: "paula@dinkbit.com", password: "1234567890", rol: "comercial", marca_id: null } });
    expect(leerNuevaUsuaria(fd({ nombre: "Paula", email: "x@y.es", password: "corta", rol: "comercial" }))).toMatchObject({ ok: false });
    expect(leerNuevaUsuaria(fd({ nombre: "Paula", email: "x@y.es", password: "1234567890", rol: "jefa" }))).toMatchObject({ ok: false });
  });

  test("leerPassword exige 10 caracteres", () => {
    expect(leerPassword("123")).toMatchObject({ ok: false });
    expect(leerPassword("1234567890")).toEqual({ ok: true, datos: "1234567890" });
  });
});

describe("leerNuevaMarca", () => {
  test("genera el slug desde el nombre si viene vacío", () => {
    expect(leerNuevaMarca(fd({ nombre: "Hydrup", slug: "" }))).toEqual({ ok: true, datos: { nombre: "Hydrup", slug: "hydrup" } });
  });

  test("rechaza slugs con mayúsculas o espacios", () => {
    expect(leerNuevaMarca(fd({ nombre: "Hydrup", slug: "Hy drup" }))).toMatchObject({ ok: false });
  });

  test("rechaza los identificadores que ya son rutas del panel", () => {
    expect(leerNuevaMarca(fd({ nombre: "Hoy", slug: "" }))).toEqual({ ok: false, error: "Ese identificador está reservado: elige otro." });
    expect(leerNuevaMarca(fd({ nombre: "X", slug: "usuarias" }))).toMatchObject({ ok: false });
  });
});

describe("leerCondiciones", () => {
  test("condiciones de Hydrup: 4 % para siempre, sin cuota", () => {
    const r = leerCondiciones(
      fd({ estado: "activa", fecha_inicio: "2026-09-17", cuota_mensual: "", comision_pct: "4", plazo_meses: "", pago_por_cliente: "0", skus_b2b: "PACK-MUESTRAS\nPACK-24, PACK-48" }),
    );
    expect(r).toEqual({
      ok: true,
      datos: {
        estado: "activa",
        fecha_inicio: "2026-09-17",
        cuota_mensual_cts: 0,
        comision_pct: 4,
        plazo_meses: null,
        pago_por_cliente_cts: 0,
        skus_b2b: ["PACK-MUESTRAS", "PACK-24", "PACK-48"],
      },
    });
  });

  test("acepta la coma decimal en el porcentaje y rechaza más de 100", () => {
    expect(leerCondiciones(fd({ estado: "activa", comision_pct: "4,5" }))).toMatchObject({ ok: true, datos: { comision_pct: 4.5 } });
    expect(leerCondiciones(fd({ estado: "activa", comision_pct: "120" }))).toMatchObject({ ok: false });
  });

  test("plazo en meses debe ser entero positivo", () => {
    expect(leerCondiciones(fd({ estado: "activa", comision_pct: "4", plazo_meses: "0" }))).toMatchObject({ ok: false });
    expect(leerCondiciones(fd({ estado: "activa", comision_pct: "4", plazo_meses: "12" }))).toMatchObject({ ok: true, datos: { plazo_meses: 12 } });
  });
});

describe("leerExclusion", () => {
  test("pide al menos email, teléfono o CIF", () => {
    expect(leerExclusion(fd({ nombre: "Gym antiguo" }))).toMatchObject({ ok: false });
    expect(leerExclusion(fd({ nombre: "Gym antiguo", cif: "B123" }))).toMatchObject({ ok: true });
  });
});

describe("leerDatosLead", () => {
  test("acepta un lead con teléfono y tipo", () => {
    const r = leerDatosLead(fd({ negocio: "Gym Sol", tipo_negocio: "gimnasio", telefono: "600111222" }));
    expect(r).toEqual({
      ok: true,
      datos: { negocio: "Gym Sol", tipo_negocio: "gimnasio", contacto: "", telefono: "600111222", email: "", ciudad: "", cif: "", web: "" },
    });
  });

  test("tipo vacío es null; sin teléfono ni email es error", () => {
    expect(leerDatosLead(fd({ negocio: "Gym", tipo_negocio: "", email: "a@b.es" }))).toMatchObject({ ok: true, datos: { tipo_negocio: null } });
    expect(leerDatosLead(fd({ negocio: "Gym" }))).toEqual({ ok: false, error: "Hace falta teléfono o email." });
  });
});

describe("leerLlamada y compañía", () => {
  test("llamada con seguimiento", () => {
    expect(leerLlamada(fd({ resultado: "volver_a_llamar", nota: " Llamar tarde ", proximo_seguimiento: "2026-09-20" }))).toEqual({
      ok: true,
      datos: { resultado: "volver_a_llamar", nota: "Llamar tarde", proximo_seguimiento: "2026-09-20", proximo_seguimiento_hora: null },
    });
  });

  test("sin resultado es error; fecha vacía es null", () => {
    expect(leerLlamada(fd({ resultado: "" }))).toMatchObject({ ok: false });
    expect(leerLlamada(fd({ resultado: "no_contesta", proximo_seguimiento: "" }))).toMatchObject({ ok: true, datos: { proximo_seguimiento: null, proximo_seguimiento_hora: null } });
  });

  test("nota y cambio de fase", () => {
    expect(leerNotaSeguimiento(fd({ nota: "Hola", proximo_seguimiento: "" }))).toEqual({ ok: true, datos: { nota: "Hola", proximo_seguimiento: null, proximo_seguimiento_hora: null } });
    expect(leerCambioFase(fd({ fase: "perdido", nota: "Cerró el local" }))).toEqual({ ok: true, datos: { fase: "perdido", nota: "Cerró el local" } });
    expect(leerCambioFase(fd({ fase: "otra" }))).toMatchObject({ ok: false });
  });
});

describe("hora de seguimiento", () => {
  test("fecha y hora válidas", () => {
    const r = leerNotaSeguimiento(fd({ nota: "x", proximo_seguimiento: "2026-10-20", proximo_seguimiento_hora: "16:30" }));
    expect(r).toEqual({ ok: true, datos: { nota: "x", proximo_seguimiento: "2026-10-20", proximo_seguimiento_hora: "16:30" } });
  });
  test("sin hora queda en null", () => {
    const r = leerNotaSeguimiento(fd({ nota: "x", proximo_seguimiento: "2026-10-20" }));
    expect(r.ok && r.datos.proximo_seguimiento_hora).toBeNull();
  });
  test("hora sin fecha: error", () => {
    expect(leerNotaSeguimiento(fd({ nota: "x", proximo_seguimiento_hora: "16:30" }))).toEqual({ ok: false, error: "Para poner hora hace falta la fecha." });
    expect(leerLlamada(fd({ resultado: "interesado", proximo_seguimiento_hora: "16:30" }))).toEqual({ ok: false, error: "Para poner hora hace falta la fecha." });
  });
  test.each(["9:5", "25:00", "12:60", "tarde"])("hora «%s» no válida", (hora) => {
    expect(leerLlamada(fd({ resultado: "interesado", nota: "", proximo_seguimiento: "2026-10-20", proximo_seguimiento_hora: hora }))).toEqual({ ok: false, error: "Hora de seguimiento no válida." });
  });
});
