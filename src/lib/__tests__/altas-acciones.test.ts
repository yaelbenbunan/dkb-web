import { beforeEach, describe, expect, test, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireUsuaria: vi.fn(),
  getAltaPorToken: vi.fn(),
  getAltaPorId: vi.fn(),
  crearAlta: vi.fn(),
  setAltaActiva: vi.fn(),
  guardarEnvioAlta: vi.fn(),
  firmarSubida: vi.fn(),
  infoArchivo: vi.fn(),
  borrarArchivos: vi.fn(),
  avisarAltaEnviada: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/ventas/auth", () => ({ requireUsuaria: m.requireUsuaria }));
vi.mock("@/lib/altas/db", () => ({
  getAltaPorToken: m.getAltaPorToken,
  getAltaPorId: m.getAltaPorId,
  crearAlta: m.crearAlta,
  setAltaActiva: m.setAltaActiva,
  guardarEnvioAlta: m.guardarEnvioAlta,
  firmarSubida: m.firmarSubida,
  infoArchivo: m.infoArchivo,
  borrarArchivos: m.borrarArchivos,
}));
vi.mock("@/lib/altas/aviso", () => ({ avisarAltaEnviada: m.avisarAltaEnviada }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));

import { enviarAltaAction, pedirSubidaAction } from "@/app/(alta)/alta/[token]/acciones";
import { crearAltaAction, setAltaActivaAction } from "@/app/(site)/panel/ventas/acciones-altas";

const TOKEN = "A".repeat(43);
const ALTA_ID = "11111111-2222-4333-8444-555555555555";
const UUID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const RUTA_LOGO = `${ALTA_ID}/diseno/${UUID}-logo.svg`;

function alta(extra: Record<string, unknown> = {}) {
  return { id: ALTA_ID, token: TOKEN, cliente: "Nubosoft", activa: true, respuestas: {}, archivos: [], enviada_en: null, created_at: "", creada_por: null, ...extra };
}

function respuestas(): Record<string, unknown> {
  return {
    contacto_nombre: "Laura",
    contacto_email: "laura@nubosoft.es",
    contacto_telefono: "600000000",
    razon_social: "Nubosoft S.L.",
    cif: "B12345678",
    direccion_facturacion: "Calle Mayor 1",
    email_facturas: "facturas@nubosoft.es",
    servicios: "Software",
    diferencia: "Soporte",
    tipo_cliente: "b2b",
    cliente_ideal: "Pymes",
    zona: "espana",
    presupuesto: "a_definir",
    forma_pago: "tarjeta",
    consentimiento_marca: true,
  };
}

const LOGO = { campo: "logo", ruta: RUTA_LOGO, nombre: "Logo.svg" };

beforeEach(() => {
  Object.values(m).forEach((f) => f.mockReset());
  m.getAltaPorToken.mockResolvedValue(alta());
  m.firmarSubida.mockResolvedValue({ ok: true, url: "https://x.supabase.co/storage/v1/object/upload/sign/altas-clientes/r?token=t" });
  m.infoArchivo.mockResolvedValue({ tamano: 2048, tipo: "image/svg+xml" });
  m.guardarEnvioAlta.mockResolvedValue({ ok: true });
  m.avisarAltaEnviada.mockResolvedValue(undefined);
});

describe("pedirSubidaAction", () => {
  test("firma la subida a una ruta de ese alta con el nombre saneado", async () => {
    const r = await pedirSubidaAction(TOKEN, { campo: "logo", nombre: "Mi Logo.SVG", tamano: 1000, tipo: "image/svg+xml" });
    expect(r.ok).toBe(true);
    const ruta = m.firmarSubida.mock.calls[0][0] as string;
    expect(ruta).toMatch(new RegExp(`^${ALTA_ID}/diseno/[0-9a-f-]{36}-mi-logo\\.svg$`));
    expect(r).toEqual({ ok: true, ruta, url: expect.stringContaining("upload/sign") });
  });

  test("token con mala forma: ni siquiera se busca", async () => {
    const r = await pedirSubidaAction("../../otro", { campo: "logo", nombre: "a.svg", tamano: 10, tipo: "" });
    expect(r.ok).toBe(false);
    expect(m.getAltaPorToken).not.toHaveBeenCalled();
    expect(m.firmarSubida).not.toHaveBeenCalled();
  });

  test("token que no existe o alta desactivada: no firma", async () => {
    m.getAltaPorToken.mockResolvedValueOnce(null);
    expect((await pedirSubidaAction(TOKEN, { campo: "logo", nombre: "a.svg", tamano: 10, tipo: "" })).ok).toBe(false);
    m.getAltaPorToken.mockResolvedValueOnce(alta({ activa: false }));
    expect((await pedirSubidaAction(TOKEN, { campo: "logo", nombre: "a.svg", tamano: 10, tipo: "" })).ok).toBe(false);
    expect(m.firmarSubida).not.toHaveBeenCalled();
  });

  test("tipo o tamaño no permitidos: no firma", async () => {
    expect((await pedirSubidaAction(TOKEN, { campo: "manual", nombre: "manual.docx", tamano: 10, tipo: "" })).ok).toBe(false);
    expect((await pedirSubidaAction(TOKEN, { campo: "fotos", nombre: "v.mp4", tamano: 60 * 1024 * 1024, tipo: "video/mp4" })).ok).toBe(false);
    expect((await pedirSubidaAction(TOKEN, { campo: "otro", nombre: "v.mp4", tamano: 10, tipo: "" })).ok).toBe(false);
    expect((await pedirSubidaAction(TOKEN, null as never)).ok).toBe(false);
    expect(m.firmarSubida).not.toHaveBeenCalled();
  });
});

describe("enviarAltaAction", () => {
  test("guarda respuestas validadas y archivos con el tamaño real, y avisa", async () => {
    const r = await enviarAltaAction(TOKEN, { ...respuestas(), intruso: "x" }, [LOGO]);
    expect(r).toEqual({ ok: true });
    expect(m.infoArchivo).toHaveBeenCalledWith(RUTA_LOGO);
    const [id, envio] = m.guardarEnvioAlta.mock.calls[0];
    expect(id).toBe(ALTA_ID);
    expect(envio.respuestas).not.toHaveProperty("intruso");
    expect(envio.archivos).toEqual([{ campo: "logo", ruta: RUTA_LOGO, nombre: "Logo.svg", tamano: 2048, tipo: "image/svg+xml" }]);
    expect(m.avisarAltaEnviada).toHaveBeenCalledWith({ id: ALTA_ID, cliente: "Nubosoft", primeraVez: true, archivos: 1 });
  });

  test("token no válido o alta desactivada: no guarda nada", async () => {
    m.getAltaPorToken.mockResolvedValueOnce(null);
    expect((await enviarAltaAction(TOKEN, respuestas(), [LOGO])).ok).toBe(false);
    m.getAltaPorToken.mockResolvedValueOnce(alta({ activa: false }));
    expect((await enviarAltaAction(TOKEN, respuestas(), [LOGO])).ok).toBe(false);
    expect((await enviarAltaAction("corto", respuestas(), [LOGO])).ok).toBe(false);
    expect(m.guardarEnvioAlta).not.toHaveBeenCalled();
  });

  test("respuestas no válidas: devuelve el error y no guarda", async () => {
    const r = await enviarAltaAction(TOKEN, { ...respuestas(), contacto_email: "x" }, [LOGO]);
    expect(r).toMatchObject({ ok: false, error: expect.stringMatching(/email/i) });
    expect(m.guardarEnvioAlta).not.toHaveBeenCalled();
  });

  test("el logo es obligatorio", async () => {
    const r = await enviarAltaAction(TOKEN, respuestas(), []);
    expect(r).toEqual({ ok: false, error: expect.stringMatching(/logo/i) });
    expect(m.guardarEnvioAlta).not.toHaveBeenCalled();
  });

  test("rechaza rutas de otra alta o que no casan con el campo", async () => {
    const otra = { campo: "logo", ruta: `99999999-2222-4333-8444-555555555555/diseno/${UUID}-logo.svg`, nombre: "x" };
    expect((await enviarAltaAction(TOKEN, respuestas(), [otra])).ok).toBe(false);
    const jpgComoLogo = { campo: "logo", ruta: `${ALTA_ID}/diseno/${UUID}-foto.jpg`, nombre: "x" };
    expect((await enviarAltaAction(TOKEN, respuestas(), [jpgComoLogo])).ok).toBe(false);
    expect(m.guardarEnvioAlta).not.toHaveBeenCalled();
  });

  test("un archivo nuevo que no está en el bucket se rechaza", async () => {
    m.infoArchivo.mockResolvedValueOnce(null);
    const r = await enviarAltaAction(TOKEN, respuestas(), [LOGO]);
    expect(r).toEqual({ ok: false, error: expect.stringMatching(/Logo\.svg/) });
    expect(m.guardarEnvioAlta).not.toHaveBeenCalled();
  });

  test("un archivo que pesa más de lo permitido se rechaza y se borra", async () => {
    m.infoArchivo.mockResolvedValueOnce({ tamano: 51 * 1024 * 1024, tipo: "image/svg+xml" });
    expect((await enviarAltaAction(TOKEN, respuestas(), [LOGO])).ok).toBe(false);
    expect(m.borrarArchivos).toHaveBeenCalledWith([RUTA_LOGO]);
    expect(m.guardarEnvioAlta).not.toHaveBeenCalled();
  });

  test("reenvío: conserva los archivos ya guardados sin volver a mirarlos y borra los quitados", async () => {
    const guardado = { campo: "logo", ruta: RUTA_LOGO, nombre: "Logo.svg", tamano: 100, tipo: "image/svg+xml" };
    const quitado = { campo: "fotos", ruta: `${ALTA_ID}/diseno/${UUID}-foto.jpg`, nombre: "foto.jpg", tamano: 100, tipo: "image/jpeg" };
    m.getAltaPorToken.mockResolvedValue(alta({ archivos: [guardado, quitado], enviada_en: "2026-10-22T10:00:00Z" }));
    const r = await enviarAltaAction(TOKEN, respuestas(), [{ campo: "logo", ruta: RUTA_LOGO, nombre: "cambiado.svg" }]);
    expect(r.ok).toBe(true);
    expect(m.infoArchivo).not.toHaveBeenCalled();
    expect(m.guardarEnvioAlta.mock.calls[0][1].archivos).toEqual([guardado]);
    expect(m.borrarArchivos).toHaveBeenCalledWith([quitado.ruta]);
    expect(m.avisarAltaEnviada).toHaveBeenCalledWith(expect.objectContaining({ primeraVez: false }));
  });

  test("si falla el guardado, no borra ni avisa", async () => {
    m.guardarEnvioAlta.mockResolvedValueOnce({ ok: false, error: "No se pudo guardar. Vuelve a intentarlo." });
    const r = await enviarAltaAction(TOKEN, respuestas(), [LOGO]);
    expect(r.ok).toBe(false);
    expect(m.avisarAltaEnviada).not.toHaveBeenCalled();
    expect(m.borrarArchivos).not.toHaveBeenCalled();
  });

  test("si falla el correo, el envío sigue siendo un éxito", async () => {
    m.avisarAltaEnviada.mockRejectedValueOnce(new Error("resend caído"));
    expect(await enviarAltaAction(TOKEN, respuestas(), [LOGO])).toEqual({ ok: true });
  });

  test("archivos con forma rara: error y sin guardar", async () => {
    expect((await enviarAltaAction(TOKEN, respuestas(), "x" as never)).ok).toBe(false);
    expect((await enviarAltaAction(TOKEN, respuestas(), [{ campo: "logo" }] as never)).ok).toBe(false);
    expect(m.guardarEnvioAlta).not.toHaveBeenCalled();
  });
});

describe("acciones del panel", () => {
  const ADMIN = { id: "u-admin", rol: "admin", activa: true };

  test("exigen admin: si se deniega no tocan nada", async () => {
    m.requireUsuaria.mockRejectedValue(new Error("NEXT_REDIRECT"));
    const fd = new FormData();
    fd.set("cliente", "Nubosoft");
    await expect(crearAltaAction(null, fd)).rejects.toThrow();
    await expect(setAltaActivaAction(ALTA_ID, false)).rejects.toThrow();
    expect(m.requireUsuaria).toHaveBeenCalledWith("admin");
    expect(m.crearAlta).not.toHaveBeenCalled();
    expect(m.setAltaActiva).not.toHaveBeenCalled();
  });

  test("crea el alta con un token nuevo y quien la creó", async () => {
    m.requireUsuaria.mockResolvedValue(ADMIN);
    m.crearAlta.mockResolvedValue({ ok: true, id: ALTA_ID });
    const fd = new FormData();
    fd.set("cliente", "  Nubosoft  ");
    const r = await crearAltaAction(null, fd);
    expect(r.ok).toBe(true);
    expect(m.crearAlta).toHaveBeenCalledWith({ cliente: "Nubosoft", token: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/), creadaPor: "u-admin" });
  });

  test("sin nombre de cliente o demasiado largo: error", async () => {
    m.requireUsuaria.mockResolvedValue(ADMIN);
    const fd = new FormData();
    fd.set("cliente", "  ");
    expect((await crearAltaAction(null, fd)).ok).toBe(false);
    fd.set("cliente", "a".repeat(121));
    expect((await crearAltaAction(null, fd)).ok).toBe(false);
    expect(m.crearAlta).not.toHaveBeenCalled();
  });

  test("desactivar: valida el valor y que exista", async () => {
    m.requireUsuaria.mockResolvedValue(ADMIN);
    expect((await setAltaActivaAction(ALTA_ID, "no" as never)).ok).toBe(false);
    m.getAltaPorId.mockResolvedValueOnce(null);
    expect((await setAltaActivaAction(ALTA_ID, false)).ok).toBe(false);
    m.getAltaPorId.mockResolvedValueOnce(alta());
    m.setAltaActiva.mockResolvedValueOnce({ ok: true });
    expect((await setAltaActivaAction(ALTA_ID, false)).ok).toBe(true);
    expect(m.setAltaActiva).toHaveBeenCalledWith(ALTA_ID, false);
  });
});
