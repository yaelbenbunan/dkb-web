import { describe, expect, it, vi } from "vitest";
import { crearMensajero, mensajeroSimulado } from "../mensajero";

describe("mensajeroSimulado", () => {
  it("registra lo enviado y no llama a la red", async () => {
    const m = mensajeroSimulado();
    const res = await m.enviarTexto("34660415514", "hola");
    expect(res).toEqual({ ok: true, wamid: null });
    expect(m.enviados).toEqual([{ waId: "34660415514", texto: "hola" }]);
  });
});

describe("crearMensajero", () => {
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
});
