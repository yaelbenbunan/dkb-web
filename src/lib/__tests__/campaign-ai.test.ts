import { beforeEach, describe, expect, test, vi } from "vitest";

const { createMock, clientMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  clientMock: vi.fn(),
}));
vi.mock("../openai-client", () => ({ getOpenAIClient: clientMock }));

import { generateCampaignBlocks } from "../campaign-ai";

const validJson = JSON.stringify({
  blocks: [
    { id: "1", type: "hero", props: { title: "Hola", body: "b" } },
    { id: "2", type: "button", props: { label: "Ir", url: "https://x.com" } },
  ],
});

describe("generateCampaignBlocks", () => {
  beforeEach(() => {
    createMock.mockReset();
    clientMock.mockReset();
    clientMock.mockReturnValue({ chat: { completions: { create: createMock } } });
  });

  test("devuelve bloques validados y fuerza footer al final", async () => {
    createMock.mockResolvedValue({ choices: [{ message: { content: validJson } }] });
    const res = await generateCampaignBlocks({ concept: "Novedades" });
    expect(res.ok).toBe(true);
    expect(res.ok && res.blocks.at(-1)!.type).toBe("footer");
  });

  test("JSON inválido 2 veces → invalid-response", async () => {
    createMock.mockResolvedValue({ choices: [{ message: { content: "no json" } }] });
    const res = await generateCampaignBlocks({ concept: "x" });
    expect(res).toEqual({ ok: false, reason: "invalid-response" });
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  test("cuando el modelo omite el footer, los bloques devueltos terminan en un bloque footer", async () => {
    // validJson above has no footer block at all — simulates the model omitting it.
    createMock.mockResolvedValue({ choices: [{ message: { content: validJson } }] });
    const res = await generateCampaignBlocks({ concept: "Novedades" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.blocks.filter((b) => b.type === "footer")).toHaveLength(1);
    expect(res.blocks.at(-1)!.type).toBe("footer");
    expect(res.blocks.length).toBe(3); // hero + button + appended footer
  });

  test("sin OPENAI_API_KEY → missing-api-key, sin llamar a la API", async () => {
    clientMock.mockReturnValue(null);
    const res = await generateCampaignBlocks({ concept: "x" });
    expect(res).toEqual({ ok: false, reason: "missing-api-key" });
    expect(createMock).not.toHaveBeenCalled();
  });

  test("si la API falla en ambos intentos → api-error", async () => {
    createMock.mockRejectedValue(new Error("401 Incorrect API key provided"));
    const res = await generateCampaignBlocks({ concept: "x" });
    expect(res).toEqual({ ok: false, reason: "api-error" });
    expect(createMock).toHaveBeenCalledTimes(2);
  });
});
