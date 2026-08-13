import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createHash } from "node:crypto";

import { sendMetaLead } from "../meta-capi";

const sha = (v: string) => createHash("sha256").update(v).digest("hex");

describe("sendMetaLead", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset().mockResolvedValue({ ok: true, text: async () => "" });
    vi.stubGlobal("fetch", fetchMock);
    process.env.META_CAPI_TOKEN = "token-de-prueba";
    process.env.META_PIXEL_ID = "123";
  });
  afterEach(() => {
    delete process.env.META_CAPI_TOKEN;
    vi.unstubAllGlobals();
  });

  const body = () => JSON.parse(fetchMock.mock.calls[0][1].body).data[0];

  test("manda un evento Lead con el id que comparte con el píxel", async () => {
    const res = await sendMetaLead({ eventId: "abc-123", email: "a@b.com" });
    expect(res.ok).toBe(true);
    expect(body().event_name).toBe("Lead");
    // Sin este id compartido, Meta contaría dos conversiones por cada lead.
    expect(body().event_id).toBe("abc-123");
    expect(body().action_source).toBe("website");
  });

  test("el email viaja hasheado y normalizado, nunca en claro", async () => {
    await sendMetaLead({ eventId: "e", email: "  Ana@Example.COM " });
    const enviado = body().user_data.em[0];
    expect(enviado).toBe(sha("ana@example.com"));
    expect(JSON.stringify(body())).not.toContain("Ana@Example");
  });

  test("al teléfono español de 9 dígitos se le antepone el prefijo del país", async () => {
    // Sin el 34 por delante, Meta no lo casa con nadie y el emparejamiento se
    // pierde justo en el dato que más lo mejora.
    await sendMetaLead({ eventId: "e", phone: "600 111 222" });
    expect(body().user_data.ph[0]).toBe(sha("34600111222"));
  });

  test("un teléfono que ya trae prefijo no se toca", async () => {
    await sendMetaLead({ eventId: "e", phone: "+34600111222" });
    expect(body().user_data.ph[0]).toBe(sha("34600111222"));
  });

  test("las cookies del píxel se envían tal cual: mejoran el emparejamiento", async () => {
    await sendMetaLead({ eventId: "e", fbp: "fb.1.123", fbc: "fb.1.456" });
    expect(body().user_data.fbp).toBe("fb.1.123");
    expect(body().user_data.fbc).toBe("fb.1.456");
  });

  test("sin token no llama a Meta ni revienta", async () => {
    delete process.env.META_CAPI_TOKEN;
    const res = await sendMetaLead({ eventId: "e", email: "a@b.com" });
    expect(res).toEqual({ ok: false, error: "capi_token_missing" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("si Meta responde error, se informa sin lanzar", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 400, text: async () => "bad request" });
    const res = await sendMetaLead({ eventId: "e", email: "a@b.com" });
    expect(res.ok).toBe(false);
    expect(res.error).toBe("http_400");
  });

  test("si la red falla, se traga la excepción: medir no puede tumbar un lead", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    const res = await sendMetaLead({ eventId: "e", email: "a@b.com" });
    expect(res).toEqual({ ok: false, error: "request_failed" });
  });
});
