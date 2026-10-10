import { beforeEach, describe, expect, test, vi } from "vitest";

const m = vi.hoisted(() => ({
  accesoMarcaAccion: vi.fn(),
  getConversacionPorId: vi.fn(),
  guardarSaliente: vi.fn(),
  crearMensajero: vi.fn(),
  enviarTexto: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/ventas/auth", () => ({ accesoMarcaAccion: m.accesoMarcaAccion }));
vi.mock("@/lib/whatsapp/db", () => ({ getConversacionPorId: m.getConversacionPorId, guardarSaliente: m.guardarSaliente }));
vi.mock("@/lib/whatsapp/mensajero", () => ({ crearMensajero: m.crearMensajero }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));

import { responder } from "@/app/(site)/panel/ventas/(app)/[slug]/conversaciones/acciones";

const MARCA = { id: "m1", slug: "hydrup" };
const ABIERTA = new Date(Date.now() + 3_600_000).toISOString();
const CONVERSACION = { id: "c1", marca_id: "m1", wa_id: "34600111222", ventana_hasta: ABIERTA };

beforeEach(() => {
  Object.values(m).forEach((f) => f.mockReset());
  m.accesoMarcaAccion.mockResolvedValue({ ok: true, usuaria: { id: "u1", rol: "comercial", activa: true }, marca: MARCA });
  m.getConversacionPorId.mockResolvedValue(CONVERSACION);
  m.enviarTexto.mockResolvedValue({ ok: true, wamid: "w1" });
  m.crearMensajero.mockReturnValue({ enviarTexto: m.enviarTexto });
});

describe("responder", () => {
  test("si el acceso falla devuelve ese error y no crea mensajero ni guarda nada", async () => {
    m.accesoMarcaAccion.mockResolvedValue({ ok: false, error: "No tienes permiso para esto." });
    expect(await responder("hydrup", "c1", "Hola")).toEqual({ ok: false, error: "No tienes permiso para esto." });
    expect(m.getConversacionPorId).not.toHaveBeenCalled();
    expect(m.crearMensajero).not.toHaveBeenCalled();
    expect(m.enviarTexto).not.toHaveBeenCalled();
    expect(m.guardarSaliente).not.toHaveBeenCalled();
  });

  test("pide exactamente la sección «conversaciones» con el slug recibido", async () => {
    await responder("hydrup", "c1", "Hola");
    expect(m.accesoMarcaAccion).toHaveBeenCalledTimes(1);
    expect(m.accesoMarcaAccion).toHaveBeenCalledWith("hydrup", "conversaciones");
  });

  test("una conversación de otra marca se rechaza sin enviar ni guardar", async () => {
    m.getConversacionPorId.mockResolvedValue({ ...CONVERSACION, marca_id: "otra" });
    expect(await responder("hydrup", "c1", "Hola")).toEqual({ ok: false, error: "Conversación no encontrada." });
    expect(m.crearMensajero).not.toHaveBeenCalled();
    expect(m.enviarTexto).not.toHaveBeenCalled();
    expect(m.guardarSaliente).not.toHaveBeenCalled();
  });

  test("una conversación de la marca se envía y se guarda", async () => {
    expect(await responder("hydrup", "c1", " Hola ")).toEqual({ ok: true });
    expect(m.enviarTexto).toHaveBeenCalledWith("34600111222", "Hola");
    expect(m.guardarSaliente).toHaveBeenCalledWith({ conversacionId: "c1", wamid: "w1", texto: "Hola" });
  });
});
