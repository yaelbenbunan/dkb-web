import { describe, expect, it } from "vitest";
import { leerEventoRegistro } from "../registro";

const FB = "https://www.facebook.com";
const datos = (d: object) => JSON.stringify({ type: "WA_EMBEDDED_SIGNUP", ...d });

describe("leerEventoRegistro", () => {
  it("FINISH con WABA y número", () => {
    expect(leerEventoRegistro({ origin: FB, data: datos({ event: "FINISH", data: { waba_id: "111", phone_number_id: "222" } }) })).toEqual({
      wabaId: "111",
      numeroId: "222",
    });
  });

  it("el alta en coexistencia, desde web.facebook.com y con data como objeto", () => {
    const data = { type: "WA_EMBEDDED_SIGNUP", event: "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING", data: { waba_id: "111" } };
    expect(leerEventoRegistro({ origin: "https://web.facebook.com", data })).toEqual({ wabaId: "111", numeroId: null });
  });

  it("CANCEL y ERROR son «cancelado»", () => {
    expect(leerEventoRegistro({ origin: FB, data: datos({ event: "CANCEL", data: { current_step: "x" } }) })).toBe("cancelado");
    expect(leerEventoRegistro({ origin: FB, data: datos({ event: "ERROR", data: { error_message: "x" } }) })).toBe("cancelado");
  });

  it("ignora otros orígenes, otros tipos y basura", () => {
    const bueno = datos({ event: "FINISH", data: { waba_id: "111", phone_number_id: "222" } });
    expect(leerEventoRegistro({ origin: "https://evil.example", data: bueno })).toBeNull();
    expect(leerEventoRegistro({ origin: "https://www.facebook.com.evil.example", data: bueno })).toBeNull();
    expect(leerEventoRegistro({ origin: FB, data: JSON.stringify({ type: "OTRO", event: "FINISH" }) })).toBeNull();
    expect(leerEventoRegistro({ origin: FB, data: "no es json" })).toBeNull();
    expect(leerEventoRegistro({ origin: FB, data: null })).toBeNull();
    expect(leerEventoRegistro({ origin: FB, data: datos({ event: "OTRO" }) })).toBeNull();
  });

  it("FINISH sin WABA o con ids que no son dígitos se ignora", () => {
    expect(leerEventoRegistro({ origin: FB, data: datos({ event: "FINISH", data: {} }) })).toBeNull();
    expect(leerEventoRegistro({ origin: FB, data: datos({ event: "FINISH", data: { waba_id: "1a1" } }) })).toBeNull();
    expect(leerEventoRegistro({ origin: FB, data: datos({ event: "FINISH", data: { waba_id: "111", phone_number_id: "x" } }) })).toEqual({
      wabaId: "111",
      numeroId: null,
    });
  });
});
