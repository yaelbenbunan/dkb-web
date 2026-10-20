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
    expect(m.conectarNumero).toHaveBeenCalledWith({ marcaId: "m1", code: "abc", wabaId: "111", numeroId: "222" });
    expect(m.revalidatePath).toHaveBeenCalledWith("/panel/ventas/hydrup/whatsapp");
  });

  test("el admin conecta con numeroId null", async () => {
    conUsuaria({ rol: "admin", marca_id: null });
    await conectarWhatsAppAction("hydrup", { ...DATOS, numeroId: null });
    expect(m.conectarNumero).toHaveBeenCalledWith({ marcaId: "m1", code: "abc", wabaId: "111", numeroId: null });
  });
});
