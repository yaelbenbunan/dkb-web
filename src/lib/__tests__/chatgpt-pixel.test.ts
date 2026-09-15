import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  CHATGPT_PIXEL_ID,
  trackChatGptLead,
  trackChatGptPageView,
} from "../chatgpt-pixel";

describe("CHATGPT_PIXEL_ID", () => {
  test("hay un id de píxel con el que trabajar", () => {
    expect(CHATGPT_PIXEL_ID).toBeTruthy();
  });
});

describe("trackChatGptLead", () => {
  afterEach(() => {
    delete window.oaiq;
  });

  test("sin el SDK cargado no revienta ni intenta nada", () => {
    delete window.oaiq;
    expect(() => trackChatGptLead("evt-1", "hero_home")).not.toThrow();
  });

  test("manda el evento estándar de lead con su id para deduplicar", () => {
    const oaiq = vi.fn();
    window.oaiq = oaiq;

    trackChatGptLead("evt-1", "hero_home");

    expect(oaiq).toHaveBeenCalledTimes(1);
    const [accion, evento, datos, opciones] = oaiq.mock.calls[0];
    expect(accion).toBe("measure");
    expect(evento).toBe("lead_created");
    expect(datos).toMatchObject({ type: "contents" });
    expect(opciones).toMatchObject({ event_id: "evt-1" });
  });

  test("lleva el formulario de origen, para saber qué convierte", () => {
    const oaiq = vi.fn();
    window.oaiq = oaiq;

    trackChatGptLead("evt-2", "contact_long");

    const datos = oaiq.mock.calls[0][2] as { contents?: { id?: string }[] };
    expect(datos.contents?.[0]?.id).toBe("contact_long");
  });

  test("sin event_id sigue mandando el evento", () => {
    const oaiq = vi.fn();
    window.oaiq = oaiq;

    trackChatGptLead("", "hero_home");

    expect(oaiq).toHaveBeenCalledTimes(1);
    expect(oaiq.mock.calls[0][3]).toEqual({});
  });
});

describe("trackChatGptPageView", () => {
  beforeEach(() => {
    delete window.oaiq;
  });
  afterEach(() => {
    delete window.oaiq;
  });

  test("sin el SDK cargado no hace nada", () => {
    expect(() => trackChatGptPageView("/servicios")).not.toThrow();
  });

  test("manda page_viewed con la ruta", () => {
    const oaiq = vi.fn();
    window.oaiq = oaiq;

    trackChatGptPageView("/servicios/ecommerce");

    const [accion, evento, datos] = oaiq.mock.calls[0];
    expect(accion).toBe("measure");
    expect(evento).toBe("page_viewed");
    expect(JSON.stringify(datos)).toContain("/servicios/ecommerce");
  });
});
