import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

const db = vi.hoisted(() => ({
  prospectosPorIds: vi.fn(),
  getPlantilla: vi.fn(),
  listarSuprimidos: vi.fn(),
  enviadosDesde: vi.fn(),
  reclamarParaEnvio: vi.fn(),
  registrarEnvio: vi.fn(),
  revertirEnvio: vi.fn(),
}));
vi.mock("../db", () => db);

const { listLeadContactsMock } = vi.hoisted(() => ({ listLeadContactsMock: vi.fn() }));
vi.mock("../../imagina-leads", () => ({ listLeadContacts: listLeadContactsMock }));

import { componerCorreo, enviarProspectos } from "../enviar";

const FROM = "hola@mail.dinkbit.es";
const plantilla = { id: "t1", name: "Web", subject: "Una web para {{empresa}}", body: "Hola {{empresa}} de {{ciudad}}." };
const prospecto = (extra: Record<string, unknown> = {}) => ({
  id: "p1",
  name: "Bar Pepe",
  city: "Madrid",
  sector: "Restaurante",
  website: "https://barpepe.es",
  email: "info@barpepe.es",
  email_kind: "generica",
  status: "listo",
  ...extra,
});

beforeEach(() => {
  vi.stubEnv("PROSPECT_SENDERS", FROM);
  vi.stubEnv("PROMO_TOKEN_SECRET", "secreto");
  for (const f of Object.values(db)) f.mockReset();
  sendMock.mockReset();
  listLeadContactsMock.mockReset();
  db.getPlantilla.mockResolvedValue(plantilla);
  db.prospectosPorIds.mockResolvedValue([prospecto()]);
  db.listarSuprimidos.mockResolvedValue(new Set());
  db.enviadosDesde.mockResolvedValue(0);
  db.reclamarParaEnvio.mockResolvedValue(true);
  listLeadContactsMock.mockResolvedValue([]);
  sendMock.mockResolvedValue({ data: { id: "re_1" }, error: null });
});
afterEach(() => vi.unstubAllEnvs());

describe("enviarProspectos", () => {
  test("envía un correo individual, con respuesta a dinkbit y enlace de baja", async () => {
    const r = await enviarProspectos(["p1"], "t1", { from: FROM });
    expect(r).toEqual({ ok: true, enviados: 1, omitidos: [] });

    expect(sendMock).toHaveBeenCalledTimes(1);
    const correo = sendMock.mock.calls[0][0];
    expect(correo.to).toBe("info@barpepe.es");
    expect(correo.from).toBe(`"dinkbit" <${FROM}>`);
    expect(correo.replyTo).toBe("hola@dinkbit.es");
    expect(correo.subject).toBe("Una web para Bar Pepe");
    expect(correo.text).toContain("Hola Bar Pepe de Madrid.");
    expect(correo.text).toContain("/api/prospeccion/baja?id=p1&token=");
    expect(correo.html).toContain("/api/prospeccion/baja?id=p1&amp;token=");
    expect(correo.headers["List-Unsubscribe"]).toMatch(/^<https:\/\/www\.dinkbit\.es\/api\/prospeccion\/baja\?id=p1&token=.+>$/);
    expect(db.registrarEnvio).toHaveBeenCalledWith("p1", { resendId: "re_1", templateId: "t1" });
  });

  test("sin PROSPECT_SENDERS no envía, aunque exista el remitente de campañas", async () => {
    vi.stubEnv("PROSPECT_SENDERS", "");
    vi.stubEnv("CAMPAIGN_SENDERS", "hola@dinkbit.es");
    const r = await enviarProspectos(["p1"], "t1", { from: "hola@dinkbit.es" });
    expect(r).toEqual({ ok: false, error: "sin_remitente", enviados: 0, omitidos: [] });
    expect(sendMock).not.toHaveBeenCalled();
  });

  test("sin forma de firmar el enlace de baja no envía nada", async () => {
    vi.stubEnv("PROMO_TOKEN_SECRET", "");
    vi.stubEnv("RESEND_API_KEY", "");
    const r = await enviarProspectos(["p1"], "t1", { from: FROM });
    expect(r).toEqual({ ok: false, error: "sin_baja", enviados: 0, omitidos: [] });
    expect(sendMock).not.toHaveBeenCalled();
    expect(db.reclamarParaEnvio).not.toHaveBeenCalled();
  });

  test("rechaza un remitente fuera de la lista", async () => {
    const r = await enviarProspectos(["p1"], "t1", { from: "otro@dinkbit.es" });
    expect(r.error).toBe("remitente_no_permitido");
    expect(sendMock).not.toHaveBeenCalled();
  });

  test("plantilla inexistente", async () => {
    db.getPlantilla.mockResolvedValue(null);
    expect((await enviarProspectos(["p1"], "nope", { from: FROM })).error).toBe("plantilla_no_encontrada");
  });

  test("doble clic: si otra petición ya reclamó la fila, no sale un segundo correo", async () => {
    db.reclamarParaEnvio.mockResolvedValue(false);
    const r = await enviarProspectos(["p1"], "t1", { from: FROM });
    expect(r.enviados).toBe(0);
    expect(r.omitidos).toEqual([{ id: "p1", motivo: "ya_reclamado" }]);
    expect(sendMock).not.toHaveBeenCalled();
  });

  test("si Resend falla, deshace el reclamo y no cuenta como enviado", async () => {
    sendMock.mockResolvedValue({ data: null, error: { message: "domain not verified" } });
    const r = await enviarProspectos(["p1"], "t1", { from: FROM });
    expect(r.enviados).toBe(0);
    expect(r.omitidos).toEqual([{ id: "p1", motivo: "fallo_resend", detalle: "domain not verified" }]);
    expect(db.revertirEnvio).toHaveBeenCalledWith("p1", "domain not verified");
    expect(db.registrarEnvio).not.toHaveBeenCalled();
  });

  test("si Resend lanza, también deshace el reclamo", async () => {
    sendMock.mockRejectedValue(new Error("timeout"));
    const r = await enviarProspectos(["p1"], "t1", { from: FROM });
    expect(r.omitidos[0]).toMatchObject({ motivo: "fallo_resend", detalle: "timeout" });
    expect(db.revertirEnvio).toHaveBeenCalledWith("p1", "timeout");
  });

  test("no reclama la fila si a la plantilla le falta un dato", async () => {
    db.prospectosPorIds.mockResolvedValue([prospecto({ city: null })]);
    const r = await enviarProspectos(["p1"], "t1", { from: FROM });
    expect(r.omitidos).toEqual([{ id: "p1", motivo: "faltan_datos", detalle: "ciudad" }]);
    expect(db.reclamarParaEnvio).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  test("respeta la supresión y a quien ya es lead", async () => {
    db.prospectosPorIds.mockResolvedValue([
      prospecto({ id: "a", email: "info@a.es" }),
      prospecto({ id: "b", email: "info@b.es" }),
    ]);
    db.listarSuprimidos.mockResolvedValue(new Set(["info@a.es"]));
    listLeadContactsMock.mockResolvedValue([{ email: "INFO@b.es", phone: null }]);
    const r = await enviarProspectos(["a", "b"], "t1", { from: FROM });
    expect(r.enviados).toBe(0);
    expect(r.omitidos).toEqual([
      { id: "a", motivo: "suprimido" },
      { id: "b", motivo: "ya_es_lead" },
    ]);
  });

  test("una dirección personal no sale en un envío múltiple ni sin confirmar", async () => {
    const personal = prospecto({ email: "juan@barpepe.es", email_kind: "personal" });
    db.prospectosPorIds.mockResolvedValue([personal]);
    expect((await enviarProspectos(["p1"], "t1", { from: FROM })).omitidos[0].motivo).toBe("personal_sin_confirmar");

    db.prospectosPorIds.mockResolvedValue([personal, prospecto({ id: "p2", email: "info@otro.es" })]);
    const multiple = await enviarProspectos(["p1", "p2"], "t1", { from: FROM, confirmarPersonal: true });
    expect(multiple.omitidos).toEqual([{ id: "p1", motivo: "personal_sin_confirmar" }]);
    expect(multiple.enviados).toBe(1);

    db.prospectosPorIds.mockResolvedValue([personal]);
    expect((await enviarProspectos(["p1"], "t1", { from: FROM, confirmarPersonal: true })).enviados).toBe(1);
  });

  test("al llegar al tope diario manda hasta el tope y deja el resto sin tocar", async () => {
    vi.stubEnv("PROSPECT_DAILY_LIMIT", "30");
    db.enviadosDesde.mockResolvedValue(29);
    db.prospectosPorIds.mockResolvedValue([
      prospecto({ id: "a", email: "info@a.es" }),
      prospecto({ id: "b", email: "info@b.es" }),
    ]);
    const r = await enviarProspectos(["a", "b"], "t1", { from: FROM });
    expect(r.enviados).toBe(1);
    expect(r.omitidos).toEqual([{ id: "b", motivo: "tope_diario" }]);
    expect(db.reclamarParaEnvio).toHaveBeenCalledTimes(1);
  });

  test("un envío fallido no gasta cupo del tope", async () => {
    vi.stubEnv("PROSPECT_DAILY_LIMIT", "1");
    db.prospectosPorIds.mockResolvedValue([
      prospecto({ id: "a", email: "info@a.es" }),
      prospecto({ id: "b", email: "info@b.es" }),
    ]);
    sendMock
      .mockResolvedValueOnce({ data: null, error: { message: "x" } })
      .mockResolvedValueOnce({ data: { id: "re_2" }, error: null });
    const r = await enviarProspectos(["a", "b"], "t1", { from: FROM });
    expect(r.enviados).toBe(1);
  });

  test("un id que no existe se informa como omitido", async () => {
    db.prospectosPorIds.mockResolvedValue([]);
    const r = await enviarProspectos(["fantasma"], "t1", { from: FROM });
    expect(r.omitidos).toEqual([{ id: "fantasma", motivo: "estado" }]);
  });
});

describe("componerCorreo", () => {
  test("el pie identifica a dinkbit, dice de dónde sale la dirección y enlaza la baja", () => {
    const { html, text } = componerCorreo("Hola <Bar>", "https://www.dinkbit.es/baja?id=1&token=2");
    expect(text).toContain("Hola <Bar>");
    expect(text).toContain("publicada en su web");
    expect(text).toContain("https://www.dinkbit.es/baja?id=1&token=2");
    expect(html).toContain("Hola &lt;Bar&gt;");
    expect(html).toContain('href="https://www.dinkbit.es/baja?id=1&amp;token=2"');
    expect(html).toContain("dinkbit");
  });
});
