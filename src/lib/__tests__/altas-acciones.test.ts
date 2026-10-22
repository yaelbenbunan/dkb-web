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
  usoAlta: vi.fn(),
  modificarPendientes: vi.fn(),
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
  usoAlta: m.usoAlta,
  modificarPendientes: m.modificarPendientes,
}));
vi.mock("@/lib/altas/aviso", () => ({ avisarAltaEnviada: m.avisarAltaEnviada }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));

import { enviarAltaAction, pedirSubidaAction, quitarArchivoAction } from "@/app/(alta)/alta/[token]/acciones";
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

/** Firmas pendientes del alta en memoria; `modificarPendientes` les aplica el cambio como la base. */
const pend = { lista: [] as unknown[], columna: true };
async function modificarEnMemoria(_id: string, cambio: (l: unknown[]) => { ok: boolean; pendientes?: unknown[]; error?: string }) {
  if (!pend.columna) return { estado: "sin_columna" };
  const r = cambio(pend.lista);
  if (!r.ok) return { estado: "rechazo", error: r.error };
  pend.lista = r.pendientes ?? [];
  return { estado: "ok" };
}

beforeEach(() => {
  Object.values(m).forEach((f) => f.mockReset());
  m.getAltaPorToken.mockResolvedValue(alta());
  m.firmarSubida.mockResolvedValue({ ok: true, url: "https://x.supabase.co/storage/v1/object/upload/sign/altas-clientes/r?token=t" });
  m.infoArchivo.mockResolvedValue({ estado: "ok", tamano: 2048, tipo: "image/svg+xml" });
  pend.lista = [];
  pend.columna = true;
  m.modificarPendientes.mockImplementation(modificarEnMemoria);
  m.guardarEnvioAlta.mockResolvedValue({ ok: true });
  m.avisarAltaEnviada.mockResolvedValue(undefined);
  m.usoAlta.mockResolvedValue({ archivos: 0, bytes: 0, rutas: [] });
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
    m.infoArchivo.mockResolvedValueOnce({ estado: "no_existe" });
    const r = await enviarAltaAction(TOKEN, respuestas(), [LOGO]);
    expect(r).toEqual({ ok: false, error: expect.stringMatching(/Logo\.svg/) });
    expect(m.guardarEnvioAlta).not.toHaveBeenCalled();
  });

  test("un archivo que pesa más de lo permitido se rechaza y se borra", async () => {
    m.infoArchivo.mockResolvedValueOnce({ estado: "ok", tamano: 51 * 1024 * 1024, tipo: "image/svg+xml" });
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

describe("cupo por alta y quitar archivos", () => {
  const GB = 1024 * 1024 * 1024;
  const PEDIDO = { campo: "fotos", nombre: "v.mp4", tamano: 10 * 1024 * 1024, tipo: "video/mp4" };

  test("firma mientras quepa: 39 archivos y hueco para 50 MB", async () => {
    m.usoAlta.mockResolvedValueOnce({ archivos: 39, bytes: GB - 50 * 1024 * 1024, rutas: [] });
    expect((await pedirSubidaAction(TOKEN, PEDIDO)).ok).toBe(true);
    expect(m.usoAlta).toHaveBeenCalledWith(expect.objectContaining({ id: ALTA_ID }));
    expect(pend.lista).toEqual([expect.objectContaining({ ruta: m.firmarSubida.mock.calls[0][0] })]);
  });

  test("con 40 archivos no firma más", async () => {
    m.usoAlta.mockResolvedValueOnce({ archivos: 40, bytes: 0, rutas: [] });
    expect(await pedirSubidaAction(TOKEN, PEDIDO)).toEqual({ ok: false, error: expect.stringMatching(/40 archivos o 1 GB/) });
    expect(m.firmarSubida).not.toHaveBeenCalled();
  });

  test("no se fía del tamaño declarado: cada firma cuenta 50 MB", async () => {
    // Declara 10 MB, pero solo quedan 49 MB libres.
    m.usoAlta.mockResolvedValueOnce({ archivos: 3, bytes: GB - 49 * 1024 * 1024, rutas: [] });
    expect((await pedirSubidaAction(TOKEN, PEDIDO)).ok).toBe(false);
    expect(m.firmarSubida).not.toHaveBeenCalled();
  });

  test("las firmas sin subir cuentan: no se puede pedir 1000 a la vez", async () => {
    let firmadas = 0;
    for (let i = 0; i < 30; i++) if ((await pedirSubidaAction(TOKEN, PEDIDO)).ok) firmadas++;
    // 15 por ritmo (cada 10 min), y nunca más de 20 pendientes (20 × 50 MB = 1 GB).
    expect(firmadas).toBe(15);
    expect(m.firmarSubida).toHaveBeenCalledTimes(15);
    expect(await pedirSubidaAction(TOKEN, PEDIDO)).toEqual({ ok: false, error: expect.stringMatching(/Demasiados archivos seguidos/) });
  });

  test("sin la columna de pendientes: se firma con el tope de antes (bucket y tamaño declarado)", async () => {
    pend.columna = false;
    m.usoAlta.mockResolvedValueOnce({ archivos: 39, bytes: GB - PEDIDO.tamano, rutas: [] });
    expect((await pedirSubidaAction(TOKEN, PEDIDO)).ok).toBe(true);
    m.usoAlta.mockResolvedValueOnce({ archivos: 40, bytes: 0, rutas: [] });
    expect((await pedirSubidaAction(TOKEN, PEDIDO)).ok).toBe(false);
  });

  test("si no se pueden apuntar las pendientes, no firma", async () => {
    m.modificarPendientes.mockResolvedValueOnce({ estado: "error" });
    expect((await pedirSubidaAction(TOKEN, PEDIDO)).ok).toBe(false);
    expect(m.firmarSubida).not.toHaveBeenCalled();
  });

  test("el cupo no se mira para un token no válido (ni se lista el bucket)", async () => {
    m.getAltaPorToken.mockResolvedValueOnce(null);
    expect((await pedirSubidaAction(TOKEN, PEDIDO)).ok).toBe(false);
    expect(m.usoAlta).not.toHaveBeenCalled();
  });

  test("al enviar, más de 40 archivos o más de 1 GB en total: rechazado", async () => {
    const muchos = Array.from({ length: 41 }, (_, i) => ({ campo: "fotos", ruta: `${ALTA_ID}/diseno/${UUID.slice(0, -2)}${String(i).padStart(2, "0")}-f.jpg`, nombre: "f.jpg" }));
    expect((await enviarAltaAction(TOKEN, respuestas(), [LOGO, ...muchos])).ok).toBe(false);
    const fotos = Array.from({ length: 3 }, (_, i) => ({ campo: "fotos", ruta: `${ALTA_ID}/diseno/${UUID.slice(0, -1)}${i}-f.mp4`, nombre: "f.mp4" }));
    m.infoArchivo.mockResolvedValue({ estado: "ok", tamano: 45 * 1024 * 1024, tipo: "video/mp4" });
    const veinticinco = Array.from({ length: 25 }, (_, i) => ({ campo: "fotos", ruta: `${ALTA_ID}/diseno/${UUID.slice(0, -2)}${String(i + 10).padStart(2, "0")}-f.mp4`, nombre: "f.mp4" }));
    expect(await enviarAltaAction(TOKEN, respuestas(), [LOGO, ...fotos, ...veinticinco])).toEqual({ ok: false, error: expect.stringMatching(/1 GB/) });
    expect(m.guardarEnvioAlta).not.toHaveBeenCalled();
  });

  test("quitar: borra del bucket un archivo nuevo de esa alta", async () => {
    const ruta = `${ALTA_ID}/diseno/${UUID}-foto.jpg`;
    expect(await quitarArchivoAction(TOKEN, ruta)).toEqual({ ok: true });
    expect(m.borrarArchivos).toHaveBeenCalledWith([ruta]);
  });

  test("quitar: token no válido o desactivado, nada", async () => {
    const ruta = `${ALTA_ID}/diseno/${UUID}-foto.jpg`;
    m.getAltaPorToken.mockResolvedValueOnce(null);
    expect((await quitarArchivoAction(TOKEN, ruta)).ok).toBe(false);
    m.getAltaPorToken.mockResolvedValueOnce(alta({ activa: false }));
    expect((await quitarArchivoAction(TOKEN, ruta)).ok).toBe(false);
    expect((await quitarArchivoAction("x", ruta)).ok).toBe(false);
    expect(m.borrarArchivos).not.toHaveBeenCalled();
  });

  test("quitar: rutas de otra alta o fuera del formato, nada", async () => {
    for (const ruta of [`99999999-2222-4333-8444-555555555555/diseno/${UUID}-foto.jpg`, `${ALTA_ID}/diseno/../../x`, `${ALTA_ID}`, "", 7]) {
      expect((await quitarArchivoAction(TOKEN, ruta as string)).ok).toBe(false);
    }
    expect(m.borrarArchivos).not.toHaveBeenCalled();
  });

  test("quitar: un archivo de un envío ya guardado no se borra hasta reenviar", async () => {
    m.getAltaPorToken.mockResolvedValueOnce(alta({ archivos: [{ campo: "logo", ruta: RUTA_LOGO, nombre: "Logo.svg", tamano: 1, tipo: "" }] }));
    expect(await quitarArchivoAction(TOKEN, RUTA_LOGO)).toEqual({ ok: true });
    expect(m.borrarArchivos).not.toHaveBeenCalled();
  });

  test("quitar borra el archivo pero NO libera su reserva (la URL firmada sigue valiendo)", async () => {
    m.usoAlta.mockResolvedValueOnce({ archivos: 38, bytes: 0, rutas: [] });
    const r = await pedirSubidaAction(TOKEN, PEDIDO);
    expect(r.ok).toBe(true);
    const ruta = (r as { ruta: string }).ruta;
    await quitarArchivoAction(TOKEN, ruta);
    expect(m.borrarArchivos).toHaveBeenCalledWith([ruta]);
    expect(pend.lista).toEqual([expect.objectContaining({ ruta })]);
    // Con 39 en el bucket cabría una más si la reserva se hubiera liberado; no se ha liberado.
    m.usoAlta.mockResolvedValueOnce({ archivos: 39, bytes: 0, rutas: [] });
    expect(await pedirSubidaAction(TOKEN, PEDIDO)).toEqual({ ok: false, error: expect.stringMatching(/40 archivos o 1 GB/) });
  });

  test("enviar tampoco libera reservas: solo cuentan por tamaño real cuando el archivo aparece en el bucket", async () => {
    const r = await pedirSubidaAction(TOKEN, { campo: "logo", nombre: "logo.svg", tamano: 10, tipo: "" });
    const ruta = (r as { ruta: string }).ruta;
    expect((await enviarAltaAction(TOKEN, respuestas(), [{ campo: "logo", ruta, nombre: "logo.svg" }])).ok).toBe(true);
    expect(pend.lista).toEqual([expect.objectContaining({ ruta })]);
    // 39 + esa reserva sin subir: lleno. Si el bucket ya la lista, cuenta una sola vez y cabe otra.
    m.usoAlta.mockResolvedValueOnce({ archivos: 39, bytes: 0, rutas: [] });
    expect((await pedirSubidaAction(TOKEN, PEDIDO)).ok).toBe(false);
    m.usoAlta.mockResolvedValueOnce({ archivos: 39, bytes: 0, rutas: [ruta] });
    expect((await pedirSubidaAction(TOKEN, PEDIDO)).ok).toBe(true);
  });
});

describe("envíos a la vez y comprobación de archivos", () => {
  const FOTO = `${ALTA_ID}/diseno/${UUID}-foto.jpg`;
  const guardadoLogo = { campo: "logo", ruta: RUTA_LOGO, nombre: "Logo.svg", tamano: 100, tipo: "image/svg+xml" };
  const guardadaFoto = { campo: "fotos", ruta: FOTO, nombre: "foto.jpg", tamano: 100, tipo: "image/jpeg" };

  test("guarda condicionado al envío que se leyó", async () => {
    m.getAltaPorToken.mockResolvedValue(alta({ enviada_en: "2026-10-22T10:00:00.123+00:00" }));
    await enviarAltaAction(TOKEN, respuestas(), [LOGO]);
    expect(m.guardarEnvioAlta.mock.calls[0][2]).toBe("2026-10-22T10:00:00.123+00:00");
  });

  test("si otra pestaña envió a la vez: vuelve a leer y no borra lo que la otra guardó", async () => {
    m.getAltaPorToken
      .mockResolvedValueOnce(alta({ archivos: [guardadoLogo], enviada_en: "T1" }))
      // Tras el conflicto: la otra pestaña ha guardado además la foto.
      .mockResolvedValueOnce(alta({ archivos: [guardadoLogo, guardadaFoto], enviada_en: "T2" }));
    m.guardarEnvioAlta.mockResolvedValueOnce({ ok: false, error: "x", conflicto: true }).mockResolvedValueOnce({ ok: true });
    const r = await enviarAltaAction(TOKEN, respuestas(), [LOGO], [RUTA_LOGO]);
    expect(r.ok).toBe(true);
    expect(m.guardarEnvioAlta).toHaveBeenCalledTimes(2);
    expect(m.guardarEnvioAlta.mock.calls[1][2]).toBe("T2");
    expect(m.guardarEnvioAlta.mock.calls[1][1].archivos).toEqual([guardadoLogo, guardadaFoto]);
    expect(m.borrarArchivos).not.toHaveBeenCalled();
  });

  test("dos conflictos seguidos: error, sin borrar nada", async () => {
    m.getAltaPorToken.mockResolvedValue(alta({ archivos: [guardadoLogo, guardadaFoto], enviada_en: "T1" }));
    m.guardarEnvioAlta.mockResolvedValue({ ok: false, error: "Se ha enviado el formulario desde otra ventana a la vez. Vuelve a intentarlo.", conflicto: true });
    expect(await enviarAltaAction(TOKEN, respuestas(), [LOGO], [RUTA_LOGO, FOTO])).toEqual({ ok: false, error: expect.stringMatching(/otra ventana/) });
    expect(m.guardarEnvioAlta).toHaveBeenCalledTimes(2);
    expect(m.borrarArchivos).not.toHaveBeenCalled();
  });

  test("solo borra lo guardado que esta pestaña conocía y ya no manda", async () => {
    m.getAltaPorToken.mockResolvedValue(alta({ archivos: [guardadoLogo, guardadaFoto], enviada_en: "T1" }));
    await enviarAltaAction(TOKEN, respuestas(), [LOGO], [RUTA_LOGO, FOTO]);
    expect(m.borrarArchivos).toHaveBeenCalledWith([FOTO]);
  });

  test("un fallo de Storage que no es «no existe»: mensaje propio y sin guardar", async () => {
    m.infoArchivo.mockResolvedValueOnce({ estado: "error" });
    expect(await enviarAltaAction(TOKEN, respuestas(), [LOGO])).toEqual({ ok: false, error: "No hemos podido comprobar el archivo, vuelve a intentarlo." });
    expect(m.guardarEnvioAlta).not.toHaveBeenCalled();
    expect(m.borrarArchivos).not.toHaveBeenCalled();
  });
});
