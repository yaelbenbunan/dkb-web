import { beforeEach, describe, expect, test, vi } from "vitest";

const m = vi.hoisted(() => ({
  send: vi.fn(),
  listUsuarias: vi.fn(),
  reclamar: vi.fn(),
  liberar: vi.fn(),
  seguimientos: vi.fn(),
  tareas: vi.fn(),
  marca: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: m.send };
  },
}));
vi.mock("../ventas/db", () => ({
  listUsuarias: m.listUsuarias,
  reclamarRecordatorioDiario: m.reclamar,
  liberarRecordatorioDiario: m.liberar,
  listSeguimientosUsuaria: m.seguimientos,
  listTareasUsuaria: m.tareas,
  getMarcaPorId: m.marca,
}));

import { enviarRecordatoriosDiarios } from "../ventas/recordatorio-diario-envio";

// Jueves 15/10/2026 a las 08:05 de Madrid.
const MANANA = new Date("2026-10-15T06:05:00Z");
const HYDRUP = { nombre: "Hydrup", slug: "hydrup" };
const TAREA = { id: "t1", titulo: "Enviar presupuesto", vence: "2026-10-15", vence_hora: null, notas: null, marca: HYDRUP };

function usuaria(p: Record<string, unknown>) {
  return { id: "u1", nombre: "Yael", email: "yael@x.es", rol: "admin", marca_id: null, activa: true, ...p };
}

beforeEach(() => {
  Object.values(m).forEach((f) => f.mockReset());
  vi.stubEnv("RESEND_API_KEY", "re_x");
  vi.stubEnv("CONTACT_EMAIL_FROM", "dinkbit <hola@dinkbit.es>");
  m.reclamar.mockResolvedValue("reclamado");
  m.seguimientos.mockResolvedValue([]);
  m.tareas.mockResolvedValue([TAREA]);
  m.marca.mockResolvedValue({ id: "m1", ...HYDRUP });
  m.send.mockResolvedValue({ data: { id: "e1" }, error: null });
});

describe("enviarRecordatoriosDiarios", () => {
  test("fuera de la franja no lee ni envía nada", async () => {
    expect(await enviarRecordatoriosDiarios(new Date("2026-10-15T11:00:00Z"))).toEqual({ omitido: "fuera_de_horario" });
    expect(m.listUsuarias).not.toHaveBeenCalled();
  });

  test("a todas las activas, comerciales incluidas, cada una con lo suyo", async () => {
    m.listUsuarias.mockResolvedValue([
      usuaria({ id: "a" }),
      usuaria({ id: "c", rol: "cliente", marca_id: "m1", email: "ana@hydrup.es", nombre: "Ana" }),
      usuaria({ id: "k", rol: "comercial", email: "paula@x.es", nombre: "Paula" }),
      usuaria({ id: "d", activa: false }),
    ]);
    expect(await enviarRecordatoriosDiarios(MANANA)).toEqual({ enviados: 3, sinPendientes: 0, fallidos: 0 });
    expect(m.reclamar.mock.calls).toEqual([
      ["a", "2026-10-15"],
      ["c", "2026-10-15"],
      ["k", "2026-10-15"],
    ]);
    expect(m.tareas).toHaveBeenCalledWith("k");
    expect(m.send.mock.calls.map((c) => c[0].to)).toEqual(["yael@x.es", "ana@hydrup.es", "paula@x.es"]);
    expect(m.send.mock.calls[1][0].html).toContain("/panel/ventas/hydrup/tareas?de=yo");
    // La comercial va a «Mi día», como la admin.
    expect(m.send.mock.calls[2][0].html).toContain("/panel/ventas/hoy");
  });

  test("a quien no tiene nada pendiente no le escribe", async () => {
    m.listUsuarias.mockResolvedValue([usuaria({})]);
    m.tareas.mockResolvedValue([]);
    expect(await enviarRecordatoriosDiarios(MANANA)).toEqual({ enviados: 0, sinPendientes: 1, fallidos: 0 });
    expect(m.send).not.toHaveBeenCalled();
  });

  test("si ya se envió hoy, no repite", async () => {
    m.listUsuarias.mockResolvedValue([usuaria({})]);
    m.reclamar.mockResolvedValue("ya_enviado");
    expect(await enviarRecordatoriosDiarios(MANANA)).toEqual({ enviados: 0, sinPendientes: 0, fallidos: 0 });
    expect(m.send).not.toHaveBeenCalled();
  });

  test("sin la tabla de envíos no manda nada", async () => {
    m.listUsuarias.mockResolvedValue([usuaria({ id: "a" }), usuaria({ id: "b" })]);
    m.reclamar.mockResolvedValue("falta_migracion");
    expect(await enviarRecordatoriosDiarios(MANANA)).toEqual({ omitido: "falta_migracion" });
    expect(m.send).not.toHaveBeenCalled();
    expect(m.reclamar).toHaveBeenCalledTimes(1);
  });

  test("si Resend falla, libera la reserva para reintentar y sigue con las demás", async () => {
    m.listUsuarias.mockResolvedValue([usuaria({ id: "a" }), usuaria({ id: "b", email: "b@x.es" })]);
    m.send.mockResolvedValueOnce({ data: null, error: { message: "rate limit" } });
    expect(await enviarRecordatoriosDiarios(MANANA)).toEqual({ enviados: 1, sinPendientes: 0, fallidos: 1 });
    expect(m.liberar).toHaveBeenCalledWith("a", "2026-10-15");
  });

  test("sin Resend configurado no reserva nada", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    expect(await enviarRecordatoriosDiarios(MANANA)).toEqual({ omitido: "sin_configurar" });
    expect(m.reclamar).not.toHaveBeenCalled();
  });
});
