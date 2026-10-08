import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

const { marcarPorResendIdMock, suprimirMock, estadoLeadMock } = vi.hoisted(() => ({
  marcarPorResendIdMock: vi.fn(),
  suprimirMock: vi.fn(),
  estadoLeadMock: vi.fn(),
}));
vi.mock("@/lib/prospeccion/db", () => ({
  marcarPorResendId: marcarPorResendIdMock,
  suprimir: suprimirMock,
}));
vi.mock("@/lib/resend-webhook", () => ({
  verifyResendSignature: () => true,
  resendEventStatus: (tipo: string) =>
    ({ "email.delivered": "delivered", "email.bounced": "bounced", "email.complained": "complained" })[tipo] ?? null,
  resendCampaignEventStatus: () => null,
}));
vi.mock("@/lib/imagina-leads", () => ({
  setLeadEmailStatusByMessageId: estadoLeadMock,
  setCampaignRecipientStatusByMessageId: vi.fn(),
}));

import { POST } from "@/app/api/resend/webhook/route";

beforeEach(() => {
  vi.stubEnv("RESEND_WEBHOOK_SECRET", "whsec_prueba");
  marcarPorResendIdMock.mockReset();
  suprimirMock.mockReset();
  estadoLeadMock.mockReset();
});
afterEach(() => vi.unstubAllEnvs());

const evento = (type: string, emailId = "msg-1") =>
  POST(
    new NextRequest("https://www.dinkbit.es/api/resend/webhook", {
      method: "POST",
      body: JSON.stringify({ type, data: { email_id: emailId } }),
    }),
  );

describe("webhook de Resend: correos de prospección", () => {
  test("un rebote marca el prospecto como rebotado y veta el email", async () => {
    marcarPorResendIdMock.mockResolvedValue("info@bar.es");
    const res = await evento("email.bounced");
    expect(res.status).toBe(200);
    expect(marcarPorResendIdMock).toHaveBeenCalledWith("msg-1", "rebotado");
    expect(suprimirMock).toHaveBeenCalledWith("info@bar.es", "email", "rebote");
  });

  test("una queja da de baja al prospecto y veta el email como queja", async () => {
    marcarPorResendIdMock.mockResolvedValue("info@bar.es");
    await evento("email.complained");
    expect(marcarPorResendIdMock).toHaveBeenCalledWith("msg-1", "baja");
    expect(suprimirMock).toHaveBeenCalledWith("info@bar.es", "email", "queja");
  });

  test("una entrega no toca prospectos", async () => {
    await evento("email.delivered");
    expect(marcarPorResendIdMock).not.toHaveBeenCalled();
    expect(suprimirMock).not.toHaveBeenCalled();
  });

  test("un rebote de un mensaje que no es de prospección no suprime nada y responde 200", async () => {
    marcarPorResendIdMock.mockResolvedValue(null);
    const res = await evento("email.bounced", "msg-de-un-lead");
    expect(res.status).toBe(200);
    expect(suprimirMock).not.toHaveBeenCalled();
    expect(estadoLeadMock).toHaveBeenCalledWith("msg-de-un-lead", "bounced");
  });
});
