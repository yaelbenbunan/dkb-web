import { beforeEach, describe, expect, test, vi } from "vitest";

const m = vi.hoisted(() => ({
  accesoMarcaAccion: vi.fn(),
  getConversacionPorId: vi.fn(),
  guardarSaliente: vi.fn(),
  actualizarConversacion: vi.fn(),
  crearMensajero: vi.fn(),
  mensajeroDeMarca: vi.fn(),
  enviarTexto: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/ventas/auth", () => ({ accesoMarcaAccion: m.accesoMarcaAccion }));
vi.mock("@/lib/whatsapp/db", () => ({
  getConversacionPorId: m.getConversacionPorId,
  guardarSaliente: m.guardarSaliente,
  actualizarConversacion: m.actualizarConversacion,
}));
vi.mock("@/lib/whatsapp/mensajero", () => ({ crearMensajero: m.crearMensajero }));
vi.mock("@/lib/whatsapp/numeros", () => ({ mensajeroDeMarca: m.mensajeroDeMarca }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));

import { responder } from "@/app/(site)/panel/ventas/(app)/[slug]/conversaciones/acciones";

const MARCA = { id: "m1", slug: "hydrup" };
const ABIERTA = new Date(Date.now() + 3_600_000).toISOString();
const CONVERSACION = { id: "c1", marca_id: "m1", wa_id: "34600111222", ventana_hasta: ABIERTA, estado: "humana", paso_actual: null };

beforeEach(() => {
  Object.values(m).forEach((f) => f.mockReset());
  m.accesoMarcaAccion.mockResolvedValue({ ok: true, usuaria: { id: "u1", rol: "comercial", activa: true }, marca: MARCA });
  m.getConversacionPorId.mockResolvedValue(CONVERSACION);
  m.enviarTexto.mockResolvedValue({ ok: true, wamid: "w1" });
  m.crearMensajero.mockReturnValue({ enviarTexto: m.enviarTexto });
  m.mensajeroDeMarca.mockResolvedValue({ enviarTexto: m.enviarTexto });
});

describe("responder", () => {
  test("si el acceso falla devuelve ese error y no crea mensajero ni guarda nada", async () => {
    m.accesoMarcaAccion.mockResolvedValue({ ok: false, error: "No tienes permiso para esto." });
    expect(await responder("hydrup", "c1", "Hola")).toEqual({ ok: false, error: "No tienes permiso para esto." });
    expect(m.getConversacionPorId).not.toHaveBeenCalled();
    expect(m.mensajeroDeMarca).not.toHaveBeenCalled();
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
    expect(m.mensajeroDeMarca).not.toHaveBeenCalled();
    expect(m.enviarTexto).not.toHaveBeenCalled();
    expect(m.guardarSaliente).not.toHaveBeenCalled();
  });

  test("una conversación de la marca se envía y se guarda", async () => {
    expect(await responder("hydrup", "c1", " Hola ")).toEqual({ ok: true });
    expect(m.enviarTexto).toHaveBeenCalledWith("34600111222", "Hola");
    expect(m.guardarSaliente).toHaveBeenCalledWith({ conversacionId: "c1", wamid: "w1", texto: "Hola", origen: "panel" });
  });

  test("envía con el mensajero de la marca de la conversación, no con el de entorno", async () => {
    await responder("hydrup", "c1", "Hola");
    expect(m.mensajeroDeMarca).toHaveBeenCalledWith(MARCA);
    expect(m.crearMensajero).not.toHaveBeenCalled();
  });

  test("un cliente de Hydrup responde en Hydrup y no en Dinkbit", async () => {
    m.accesoMarcaAccion.mockImplementation(async (slug: string) =>
      slug === "hydrup" ? { ok: true, usuaria: { id: "u2", rol: "cliente" }, marca: MARCA } : { ok: false, error: "No tienes permiso para esto." },
    );
    expect(await responder("hydrup", "c1", "Hola")).toEqual({ ok: true });
    expect(await responder("dinkbit", "c1", "Hola")).toEqual({ ok: false, error: "No tienes permiso para esto." });
    expect(m.enviarTexto).toHaveBeenCalledTimes(1);
  });

  test("si no se puede leer el número de la marca no envía ni cae a otro mensajero", async () => {
    m.mensajeroDeMarca.mockRejectedValue(new Error("db"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await responder("hydrup", "c1", "Hola")).toEqual({ ok: false, error: "No se pudo enviar. Vuelve a intentarlo." });
    expect(m.crearMensajero).not.toHaveBeenCalled();
    expect(m.enviarTexto).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  test("si la lleva el bot, primero la pasa a humana y quita el paso, y después envía", async () => {
    const orden: string[] = [];
    m.getConversacionPorId.mockResolvedValue({ ...CONVERSACION, estado: "bot", paso_actual: "p2" });
    m.actualizarConversacion.mockImplementation(async () => void orden.push("actualizar"));
    m.enviarTexto.mockImplementation(async () => (orden.push("enviar"), { ok: true, wamid: "w1" }));
    expect(await responder("hydrup", "c1", "Hola")).toEqual({ ok: true });
    expect(m.actualizarConversacion).toHaveBeenCalledWith("c1", { estado: "humana", pasoActual: null });
    expect(orden).toEqual(["actualizar", "enviar"]);
  });

  test("una humana con un paso pendiente también se para", async () => {
    m.getConversacionPorId.mockResolvedValue({ ...CONVERSACION, estado: "humana", paso_actual: "p1" });
    await responder("hydrup", "c1", "Hola");
    expect(m.actualizarConversacion).toHaveBeenCalledWith("c1", { estado: "humana", pasoActual: null });
  });

  test("una conversación ya humana y sin paso no se toca", async () => {
    await responder("hydrup", "c1", "Hola");
    expect(m.actualizarConversacion).not.toHaveBeenCalled();
    expect(m.enviarTexto).toHaveBeenCalledTimes(1);
  });

  test("si no se puede parar el bot no envía", async () => {
    m.getConversacionPorId.mockResolvedValue({ ...CONVERSACION, estado: "bot", paso_actual: "p2" });
    m.actualizarConversacion.mockRejectedValue(new Error("db"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await responder("hydrup", "c1", "Hola")).toEqual({ ok: false, error: "No se pudo enviar. Vuelve a intentarlo." });
    expect(m.enviarTexto).not.toHaveBeenCalled();
    expect(m.guardarSaliente).not.toHaveBeenCalled();
    log.mockRestore();
  });

  test("sin permiso no para el bot", async () => {
    m.accesoMarcaAccion.mockResolvedValue({ ok: false, error: "No tienes permiso para esto." });
    m.getConversacionPorId.mockResolvedValue({ ...CONVERSACION, estado: "bot", paso_actual: "p2" });
    await responder("hydrup", "c1", "Hola");
    expect(m.actualizarConversacion).not.toHaveBeenCalled();
  });
});
