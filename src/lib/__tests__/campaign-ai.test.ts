import { beforeEach, describe, expect, test, vi } from "vitest";

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));
vi.mock("../openai-client", () => ({
  getOpenAIClient: () => ({ chat: { completions: { create: createMock } } }),
}));

import { generateCampaignBlocks } from "../campaign-ai";

const validJson = JSON.stringify({
  blocks: [
    { id: "1", type: "hero", props: { title: "Hola", body: "b" } },
    { id: "2", type: "button", props: { label: "Ir", url: "https://x.com" } },
  ],
});

describe("generateCampaignBlocks", () => {
  beforeEach(() => createMock.mockReset());

  test("devuelve bloques validados y fuerza footer al final", async () => {
    createMock.mockResolvedValue({ choices: [{ message: { content: validJson } }] });
    const blocks = await generateCampaignBlocks({ concept: "Novedades" });
    expect(blocks).not.toBeNull();
    expect(blocks!.at(-1)!.type).toBe("footer");
  });

  test("JSON inválido 2 veces → null", async () => {
    createMock.mockResolvedValue({ choices: [{ message: { content: "no json" } }] });
    expect(await generateCampaignBlocks({ concept: "x" })).toBeNull();
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  test("cuando el modelo omite el footer, los bloques devueltos terminan en un bloque footer", async () => {
    // validJson above has no footer block at all — simulates the model omitting it.
    createMock.mockResolvedValue({ choices: [{ message: { content: validJson } }] });
    const blocks = await generateCampaignBlocks({ concept: "Novedades" });
    expect(blocks).not.toBeNull();
    expect(blocks!.filter((b) => b.type === "footer")).toHaveLength(1);
    expect(blocks!.at(-1)!.type).toBe("footer");
    expect(blocks!.length).toBe(3); // hero + button + appended footer
  });
});
