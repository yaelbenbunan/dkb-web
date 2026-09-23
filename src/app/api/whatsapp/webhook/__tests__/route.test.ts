import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Hallazgo I5 (Important) de la ronda de arreglos 2: nadie verificaba el
 * CABLEADO entre `firma.ts` y `procesarWebhook` — que la firma se comprueba
 * ANTES de parsear el cuerpo, y los códigos de estado de cada camino. Se
 * mockea `procesarWebhook` entero para aislar la ruta: lo que importa aquí
 * es el orden de las comprobaciones y qué código HTTP produce cada una, no
 * la lógica de negocio (ya cubierta en procesar.test.ts).
 */
const procesarWebhookMock = vi.fn();
vi.mock("@/lib/whatsapp/procesar", () => ({
  procesarWebhook: (...args: unknown[]) => procesarWebhookMock(...args),
}));

import { GET, POST } from "../route";

const SECRETO = "secreto-de-prueba";
const VERIFY_TOKEN = "token-de-verificacion";
const CUERPO = JSON.stringify({ object: "whatsapp_business_account", entry: [] });

function firmaDe(cuerpo: string, secreto = SECRETO): string {
  return `sha256=${createHmac("sha256", secreto).update(cuerpo).digest("hex")}`;
}

function postRequest(cuerpo: string, firma: string | null): NextRequest {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (firma !== null) headers["x-hub-signature-256"] = firma;
  return new NextRequest("http://localhost/api/whatsapp/webhook", {
    method: "POST",
    headers,
    body: cuerpo,
  });
}

describe("POST /api/whatsapp/webhook", () => {
  beforeEach(() => {
    vi.stubEnv("WHATSAPP_APP_SECRET", SECRETO);
    procesarWebhookMock.mockReset().mockResolvedValue({ procesados: 1 });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("firma válida: procesa el cuerpo ya parseado y responde 200", async () => {
    const res = await POST(postRequest(CUERPO, firmaDe(CUERPO)));

    expect(res.status).toBe(200);
    expect(procesarWebhookMock).toHaveBeenCalledTimes(1);
    expect(procesarWebhookMock).toHaveBeenCalledWith({ cuerpo: JSON.parse(CUERPO) });
  });

  it("firma inválida: 401 y ninguna escritura (no se llega a llamar a procesarWebhook)", async () => {
    const res = await POST(postRequest(CUERPO, firmaDe(CUERPO, "otro-secreto")));

    expect(res.status).toBe(401);
    expect(procesarWebhookMock).not.toHaveBeenCalled();
  });

  it("firma ausente: 401 y ninguna escritura", async () => {
    const res = await POST(postRequest(CUERPO, null));

    expect(res.status).toBe(401);
    expect(procesarWebhookMock).not.toHaveBeenCalled();
  });

  it("cuerpo que no es JSON con firma válida: 400", async () => {
    const cuerpoRoto = "esto no es json";
    const res = await POST(postRequest(cuerpoRoto, firmaDe(cuerpoRoto)));

    expect(res.status).toBe(400);
    expect(procesarWebhookMock).not.toHaveBeenCalled();
  });

  // Hallazgo de la re-revisión con mutación: los dos tests de 401 usaban
  // cuerpo JSON válido y el de 400 usaba firma válida, así que ninguno
  // vigilaba el ORDEN real de las comprobaciones. Si alguien moviera la
  // verificación de firma a DESPUÉS de `JSON.parse`, este caso (firma
  // inválida + cuerpo que no es JSON) seguiría respondiendo 401 con el
  // código actual, pero pasaría a explotar en el `JSON.parse` (o a devolver
  // 400) con el bug reintroducido. Debe seguir siendo 401 y no se debe
  // parsear ni procesar nada.
  it("cuerpo que no es JSON con firma inválida: 401, no 400, y nada se parsea", async () => {
    const cuerpoRoto = "esto no es json";
    const res = await POST(postRequest(cuerpoRoto, firmaDe(cuerpoRoto, "otro-secreto")));

    expect(res.status).toBe(401);
    expect(procesarWebhookMock).not.toHaveBeenCalled();
  });

  it("sin WHATSAPP_APP_SECRET configurado: 500 sin comprobar nada más", async () => {
    vi.unstubAllEnvs();
    const res = await POST(postRequest(CUERPO, firmaDe(CUERPO)));

    expect(res.status).toBe(500);
    expect(procesarWebhookMock).not.toHaveBeenCalled();
  });

  // La regla nueva y más frágil (ver Hallazgo I2): un fallo de FASE A
  // (antes de persistir, reintentable) debe traducirse en 500 para que Meta
  // reintente. Un refactor futuro que atrapara el error aquí y devolviera
  // 200 reintroduciría el fallo de mensajes perdidos sin que nada avisara.
  it("si procesarWebhook lanza (fallo de fase A): 500", async () => {
    procesarWebhookMock.mockRejectedValueOnce(new Error("fallo de fase A"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(postRequest(CUERPO, firmaDe(CUERPO)));

    expect(res.status).toBe(500);
    errorSpy.mockRestore();
  });
});

describe("GET /api/whatsapp/webhook (handshake)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("hub.verify_token correcto: devuelve el hub.challenge", async () => {
    vi.stubEnv("WHATSAPP_VERIFY_TOKEN", VERIFY_TOKEN);
    const req = new NextRequest(
      `http://localhost/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=desafio-123`,
    );

    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("desafio-123");
  });

  it("hub.verify_token incorrecto: 403", async () => {
    vi.stubEnv("WHATSAPP_VERIFY_TOKEN", VERIFY_TOKEN);
    const req = new NextRequest(
      "http://localhost/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=incorrecto&hub.challenge=desafio-123",
    );

    const res = await GET(req);

    expect(res.status).toBe(403);
  });

  it("hub.verify_token ausente: 403", async () => {
    vi.stubEnv("WHATSAPP_VERIFY_TOKEN", VERIFY_TOKEN);
    const req = new NextRequest("http://localhost/api/whatsapp/webhook?hub.mode=subscribe");

    const res = await GET(req);

    expect(res.status).toBe(403);
  });
});
