import { beforeEach, describe, expect, test, vi } from "vitest";

const { checkBotIdMock } = vi.hoisted(() => ({ checkBotIdMock: vi.fn() }));
vi.mock("botid/server", () => ({ checkBotId: checkBotIdMock }));

import { esEnvioDeBot, telefonoConPatronSpam } from "../antispam";

describe("telefonoConPatronSpam", () => {
  // Los bots de nov. 2026 rellenaban el Home con números de EE. UU. sin «+»:
  // un 1 y diez cifras al azar.
  test.each(["19428314176", "10837104261", "13673799553", "1 942 831 4176", "1-942-831-4176"])(
    "detecta el patrón de los bots: %s",
    (tel) => expect(telefonoConPatronSpam(tel)).toBe(true),
  );

  // Formatos que han dejado leads reales en el CRM: no se pueden tocar.
  test.each([
    "+34636551531",
    "+34 635 71 45 88",
    "627505024",
    "813672738",
    "5527651174", // México, 10 cifras
    "+1 942 831 4176", // un estadounidense de verdad pone el prefijo
    "0019428314176",
    "",
  ])("no marca un teléfono normal: %s", (tel) => expect(telefonoConPatronSpam(tel)).toBe(false));

  test("acepta null y undefined", () => {
    expect(telefonoConPatronSpam(null)).toBe(false);
    expect(telefonoConPatronSpam(undefined)).toBe(false);
  });
});

function form(telefono: string, campo = "phone"): FormData {
  const fd = new FormData();
  fd.set(campo, telefono);
  return fd;
}

describe("esEnvioDeBot", () => {
  beforeEach(() => {
    checkBotIdMock.mockReset();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    delete process.env.ANTISPAM_BOTID;
  });

  test("rechaza el teléfono de los bots sin preguntar a BotID", async () => {
    expect(await esEnvioDeBot(form("19428314176"))).toBe(true);
    expect(await esEnvioDeBot(form("16905452717", "telefono"))).toBe(true);
    expect(checkBotIdMock).not.toHaveBeenCalled();
  });

  test("con BotID apagado (por defecto) deja pasar un teléfono normal", async () => {
    checkBotIdMock.mockResolvedValue({ isBot: true });
    expect(await esEnvioDeBot(form("+34636551531"))).toBe(false);
    expect(checkBotIdMock).not.toHaveBeenCalled();
  });

  describe("con ANTISPAM_BOTID=1", () => {
    beforeEach(() => {
      process.env.ANTISPAM_BOTID = "1";
    });

    test("true cuando BotID dice que es un bot", async () => {
      checkBotIdMock.mockResolvedValue({ isBot: true, isVerifiedBot: false });
      expect(await esEnvioDeBot(form("627505024"))).toBe(true);
    });

    test("false para una persona", async () => {
      checkBotIdMock.mockResolvedValue({ isBot: false, isVerifiedBot: false });
      expect(await esEnvioDeBot(form("627505024"))).toBe(false);
    });

    test("si BotID falla deja pasar: perder un lead real es peor que colar un bot", async () => {
      const err = vi.spyOn(console, "error").mockImplementation(() => {});
      checkBotIdMock.mockImplementation(async () => {
        throw new Error("caído");
      });
      expect(await esEnvioDeBot(form("627505024"))).toBe(false);
      err.mockRestore();
    });
  });
});
