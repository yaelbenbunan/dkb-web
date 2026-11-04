import { afterEach, describe, expect, it, vi } from "vitest";
import { crearMensajero, mensajeroSimulado, partirCuerpoBotones } from "../mensajero";

describe("mensajeroSimulado", () => {
  it("registra lo enviado y no llama a la red", async () => {
    const m = mensajeroSimulado();
    const res = await m.enviarTexto("34660415514", "hola");
    expect(res).toEqual({ ok: true, wamid: null });
    expect(m.enviados).toEqual([{ waId: "34660415514", texto: "hola" }]);
  });
});

describe("crearMensajero", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sin credenciales devuelve el simulado", async () => {
    const m = crearMensajero({ token: "", phoneNumberId: "" });
    const res = await m.enviarTexto("34660415514", "hola");
    expect(res.ok).toBe(true);
  });

  it("llama a la Graph API con el cuerpo correcto", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: "wamid.ABC" }] }),
    });
    const m = crearMensajero({ token: "tok", phoneNumberId: "123", fetchImpl: fetchMock });

    const res = await m.enviarTexto("34660415514", "hola");

    expect(res).toEqual({ ok: true, wamid: "wamid.ABC" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://graph.facebook.com/v21.0/123/messages");
    expect(JSON.parse(init.body)).toEqual({
      messaging_product: "whatsapp",
      to: "34660415514",
      type: "text",
      text: { body: "hola" },
    });
    expect(init.headers.Authorization).toBe("Bearer tok");
  });

  // Review Focus 5: un fallo de Meta se devuelve tipado, nunca lanza.
  it("devuelve el error de Meta sin lanzar", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: { message: "Authorization Error", code: 100 } }),
    });
    const m = crearMensajero({ token: "tok", phoneNumberId: "123", fetchImpl: fetchMock });

    expect(await m.enviarTexto("34660415514", "hola")).toEqual({
      ok: false,
      error: "Authorization Error",
    });
  });

  it("devuelve error si la red falla", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("ECONNRESET"));
    const m = crearMensajero({ token: "tok", phoneNumberId: "123", fetchImpl: fetchMock });

    expect(await m.enviarTexto("34660415514", "hola")).toEqual({ ok: false, error: "ECONNRESET" });
  });

  // Hallazgo I4 (Important) de la ronda de arreglos 2: sin timeout, toda la
  // política de fallos depende de que Graph RESPONDA. Se comprueba que la
  // llamada lleva una señal de abort, y que si Graph se cuelga y el fetch
  // aborta, `enviarTexto` devuelve el error tipado sin lanzar (el `catch` ya
  // existente absorbe el `AbortError`).
  it("si el fetch a Graph aborta (timeout), devuelve un error tipado sin lanzar", async () => {
    const fetchMock = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      expect(init.signal).toBeInstanceOf(AbortSignal);
      // jsdom no garantiza que su `DOMException` sea `instanceof Error`
      // (el `catch` de `enviarTexto` sí lo exige para devolver el mensaje);
      // un `Error` a secas basta para ejercitar exactamente esa rama sin
      // depender de ese detalle del entorno de test.
      return Promise.reject(new Error("This operation was aborted"));
    });
    const m = crearMensajero({ token: "tok", phoneNumberId: "123", fetchImpl: fetchMock });

    await expect(m.enviarTexto("34660415514", "hola")).resolves.toEqual({
      ok: false,
      error: "This operation was aborted",
    });
  });

  // Review Focus (ronda 1, tarea 4): credenciales heredadas del entorno en una
  // preview no deben bastar para enviar de verdad — solo producción, o la
  // válvula explícita, lo autorizan.
  it("credenciales solo en el entorno y VERCEL_ENV no es 'production': usa el simulado", async () => {
    vi.stubEnv("WHATSAPP_TOKEN", "tok-env");
    vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "999");
    vi.stubEnv("VERCEL_ENV", "preview");
    const fetchMock = vi.fn();

    const m = crearMensajero({ fetchImpl: fetchMock });
    const res = await m.enviarTexto("34660415514", "hola");

    expect(res).toEqual({ ok: true, wamid: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("credenciales solo en el entorno y VERCEL_ENV === 'production': envía de verdad", async () => {
    vi.stubEnv("WHATSAPP_TOKEN", "tok-env");
    vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "999");
    vi.stubEnv("VERCEL_ENV", "production");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: "wamid.ENV" }] }),
    });

    const m = crearMensajero({ fetchImpl: fetchMock });
    const res = await m.enviarTexto("34660415514", "hola");

    expect(res).toEqual({ ok: true, wamid: "wamid.ENV" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("credenciales solo en el entorno con la válvula WHATSAPP_ENVIO_REAL=1: envía de verdad", async () => {
    vi.stubEnv("WHATSAPP_TOKEN", "tok-env");
    vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "999");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("WHATSAPP_ENVIO_REAL", "1");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: "wamid.FORZADO" }] }),
    });

    const m = crearMensajero({ fetchImpl: fetchMock });
    const res = await m.enviarTexto("34660415514", "hola");

    expect(res).toEqual({ ok: true, wamid: "wamid.FORZADO" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("enviarBotones", () => {
  const OPCIONES = ["Huecos en la agenda", "Vienen 1 vez y ya", "Solo boca a boca"];

  it("manda un mensaje interactivo con los botones", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: "wamid.BTN" }] }),
    });
    const m = crearMensajero({ token: "tok", phoneNumberId: "123", fetchImpl: fetchMock });

    const res = await m.enviarBotones("34660415514", "¿Qué te pasa?", OPCIONES);

    expect(res).toEqual({ ok: true, wamid: "wamid.BTN" });
    const cuerpo = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(cuerpo.type).toBe("interactive");
    expect(cuerpo.interactive.type).toBe("button");
    expect(cuerpo.interactive.body.text).toBe("¿Qué te pasa?");
    expect(cuerpo.interactive.action.buttons).toHaveLength(3);
    expect(cuerpo.interactive.action.buttons[0].reply.title).toBe("Huecos en la agenda");
  });

  it("el simulado registra el texto y las opciones", async () => {
    const m = mensajeroSimulado();
    await m.enviarBotones("34660415514", "¿Qué te pasa?", OPCIONES);
    expect(m.enviados).toEqual([{ waId: "34660415514", texto: "¿Qué te pasa?", opciones: OPCIONES }]);
  });

  it("rechaza lo que WhatsApp no admite en vez de dejar que falle Meta", async () => {
    // Máximo 3 botones y 20 caracteres por botón. Enterarse aquí, con un error
    // claro, es mucho mejor que recibir un rechazo opaco de Graph en producción.
    const m = mensajeroSimulado();
    await expect(m.enviarBotones("34660415514", "t", [...OPCIONES, "Uno de más"])).rejects.toThrow(/3 botones/);
    await expect(m.enviarBotones("34660415514", "t", ["Esta opción se pasa de largo"])).rejects.toThrow(/20 caracteres/);
  });
});

describe("exigirProduccion", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("con credenciales explícitas, fuera de producción queda simulado", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("WHATSAPP_ENVIO_REAL", "");
    const fetchMock = vi.fn();
    const m = crearMensajero({ token: "t", phoneNumberId: "1", fetchImpl: fetchMock, exigirProduccion: true });
    expect(await m.enviarTexto("34600", "hola")).toEqual({ ok: true, wamid: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("en producción envía de verdad", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ messages: [{ id: "w" }] }) });
    const m = crearMensajero({ token: "t", phoneNumberId: "1", fetchImpl: fetchMock, exigirProduccion: true });
    expect(await m.enviarTexto("34600", "hola")).toEqual({ ok: true, wamid: "w" });
  });
});

describe("texto con botones de más de 1024 caracteres", () => {
  const informe = `📋 Informe\n\n${"Una línea larga del informe. ".repeat(40)}`;
  const cierre = "¿Te explico cómo ponerlas en marcha?";

  it("lo que cabe no se parte", () => {
    expect(partirCuerpoBotones("hola\n\nadiós")).toEqual({ antes: null, cuerpo: "hola\n\nadiós" });
  });

  it("deja con los botones solo el último párrafo y manda el resto entero", () => {
    const { antes, cuerpo } = partirCuerpoBotones(`${informe}\n\n${cierre}`);
    expect(antes).toBe(informe.trimEnd());
    expect(cuerpo).toBe(cierre);
  });

  it("con 1025 caracteres no deja el informe a medias", () => {
    const largo = `Cabecera\n\n${"x".repeat(990)}\n\n${cierre}`;
    expect(largo.length).toBeGreaterThan(1024);
    expect(partirCuerpoBotones(largo)).toEqual({ antes: `Cabecera\n\n${"x".repeat(990)}`, cuerpo: cierre });
  });

  it("manda primero el informe como texto y luego la pregunta con los botones", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ messages: [{ id: "wamid.X" }] }) });
    const m = crearMensajero({ token: "tok", phoneNumberId: "123", fetchImpl: fetchMock });
    const res = await m.enviarBotones("34600000000", `${informe}\n\n${cierre}`, ["Sí", "No"]);
    expect(res.ok).toBe(true);
    const cuerpos = fetchMock.mock.calls.map((c) => JSON.parse(c[1].body));
    expect(cuerpos.map((b) => b.type)).toEqual(["text", "interactive"]);
    expect(cuerpos[0].text.body).toBe(informe.trimEnd());
    expect(cuerpos[1].interactive.body.text).toBe(cierre);
  });

  it("si falla el primer mensaje no manda los botones", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: { message: "caído" } }) });
    const m = crearMensajero({ token: "tok", phoneNumberId: "123", fetchImpl: fetchMock });
    expect(await m.enviarBotones("34600000000", `${informe}\n\n${cierre}`, ["Sí"])).toEqual({ ok: false, error: "caído" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
