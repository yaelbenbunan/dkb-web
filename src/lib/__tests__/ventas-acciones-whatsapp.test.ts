import { beforeEach, describe, expect, test, vi } from "vitest";

const m = vi.hoisted(() => ({
  accesoMarcaAccion: vi.fn(),
  conectarNumero: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/ventas/auth", () => ({ accesoMarcaAccion: m.accesoMarcaAccion }));
vi.mock("@/lib/whatsapp/conexion", () => ({ conectarNumero: m.conectarNumero }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));

import { conectarWhatsAppAction } from "@/app/(site)/panel/ventas/(app)/[slug]/whatsapp/acciones";

const MARCA = { id: "m1", slug: "hydrup" };
const DATOS = { code: "abc", wabaId: "111", numeroId: "222" as string | null };

function conUsuaria(usuaria: { rol: string; marca_id: string | null }) {
  m.accesoMarcaAccion.mockResolvedValue({ ok: true, usuaria: { id: "u1", activa: true, ...usuaria }, marca: MARCA });
}

beforeEach(() => {
  Object.values(m).forEach((f) => f.mockReset());
  conUsuaria({ rol: "cliente", marca_id: "m1" });
  m.conectarNumero.mockResolvedValue({ ok: true, mensaje: "Conectado." });
});

describe("conectarWhatsAppAction", () => {
  test("pide la sección «whatsapp» con el slug recibido", async () => {
    await conectarWhatsAppAction("hydrup", DATOS);
    expect(m.accesoMarcaAccion).toHaveBeenCalledWith("hydrup", "whatsapp");
  });

  test("si el acceso falla devuelve ese error sin conectar", async () => {
    m.accesoMarcaAccion.mockResolvedValue({ ok: false, error: "No tienes permiso para esto." });
    expect(await conectarWhatsAppAction("hydrup", DATOS)).toEqual({ ok: false, error: "No tienes permiso para esto." });
    expect(m.conectarNumero).not.toHaveBeenCalled();
  });

  test("una clienta de otra marca no conecta", async () => {
    conUsuaria({ rol: "cliente", marca_id: "m2" });
    expect(await conectarWhatsAppAction("hydrup", DATOS)).toEqual({ ok: false, error: "No tienes permiso para esto." });
    expect(m.conectarNumero).not.toHaveBeenCalled();
  });

  test("una comercial ve la sección pero no conecta", async () => {
    conUsuaria({ rol: "comercial", marca_id: null });
    expect(await conectarWhatsAppAction("hydrup", DATOS)).toEqual({ ok: false, error: "No tienes permiso para esto." });
    expect(m.conectarNumero).not.toHaveBeenCalled();
  });

  test("un wabaId con letras es un error de validación", async () => {
    const r = await conectarWhatsAppAction("hydrup", { ...DATOS, wabaId: "11a" });
    expect(r.ok).toBe(false);
    expect(m.conectarNumero).not.toHaveBeenCalled();
  });

  test("un numeroId con letras o un code vacío también", async () => {
    expect((await conectarWhatsAppAction("hydrup", { ...DATOS, numeroId: "2x2" })).ok).toBe(false);
    expect((await conectarWhatsAppAction("hydrup", { ...DATOS, code: " " })).ok).toBe(false);
    expect((await conectarWhatsAppAction("hydrup", { ...DATOS, code: 5 as unknown as string })).ok).toBe(false);
    expect(m.conectarNumero).not.toHaveBeenCalled();
  });

  test("la clienta de la marca conecta con la marca de la URL", async () => {
    expect(await conectarWhatsAppAction("hydrup", DATOS)).toEqual({ ok: true, mensaje: "Conectado." });
    expect(m.conectarNumero).toHaveBeenCalledWith({ marcaId: "m1", code: "abc", wabaId: "111", numeroId: "222", historialActual: null });
    expect(m.revalidatePath).toHaveBeenCalledWith("/panel/ventas/hydrup/whatsapp");
  });

  test("el admin conecta con numeroId null", async () => {
    conUsuaria({ rol: "admin", marca_id: null });
    await conectarWhatsAppAction("hydrup", { ...DATOS, numeroId: null });
    expect(m.conectarNumero).toHaveBeenCalledWith({ marcaId: "m1", code: "abc", wabaId: "111", numeroId: null, historialActual: null });
  });

  test("Dinkbit no se conecta desde aquí, ni siendo admin", async () => {
    m.accesoMarcaAccion.mockResolvedValue({
      ok: true,
      usuaria: { id: "u1", activa: true, rol: "admin", marca_id: null },
      marca: { id: "md", slug: "dinkbit" },
    });
    expect(await conectarWhatsAppAction("dinkbit", DATOS)).toEqual({
      ok: false,
      error: "Dinkbit usa el número del canal; no se conecta desde aquí.",
    });
    expect(m.conectarNumero).not.toHaveBeenCalled();
  });

  test("límites de largo: code de más de 2048 y ids de más de 32 dígitos", async () => {
    expect((await conectarWhatsAppAction("hydrup", { ...DATOS, code: "a".repeat(2049) })).ok).toBe(false);
    expect((await conectarWhatsAppAction("hydrup", { ...DATOS, wabaId: "1".repeat(33) })).ok).toBe(false);
    expect((await conectarWhatsAppAction("hydrup", { ...DATOS, numeroId: "2".repeat(33) })).ok).toBe(false);
    expect(m.conectarNumero).not.toHaveBeenCalled();
    await conectarWhatsAppAction("hydrup", { code: "a".repeat(2048), wabaId: "1".repeat(32), numeroId: "2".repeat(32) });
    expect(m.conectarNumero).toHaveBeenCalledTimes(1);
  });

  test("pasa el estado del historial de la marca para no pedirlo dos veces", async () => {
    m.accesoMarcaAccion.mockResolvedValue({
      ok: true,
      usuaria: { id: "u1", activa: true, rol: "cliente", marca_id: "m1" },
      marca: { ...MARCA, whatsapp_historial: "completo" },
    });
    await conectarWhatsAppAction("hydrup", DATOS);
    expect(m.conectarNumero.mock.calls[0][0].historialActual).toBe("completo");
  });
});
