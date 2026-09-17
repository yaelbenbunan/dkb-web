import { describe, expect, test } from "vitest";
import { clasificarRutaPanel, destinoTrasLogin, evaluarAcceso } from "../ventas/rutas";

describe("clasificarRutaPanel", () => {
  test("separa ventas del panel de leads", () => {
    expect(clasificarRutaPanel("/panel/ventas")).toBe("ventas");
    expect(clasificarRutaPanel("/panel/ventas/hydrup/leads")).toBe("ventas");
    expect(clasificarRutaPanel("/panel/ventas/login")).toBe("ventas-login");
    expect(clasificarRutaPanel("/panel/login")).toBe("panel-login");
    expect(clasificarRutaPanel("/panel/campanas")).toBe("panel");
  });

  test("una ruta que solo empieza igual no es de ventas", () => {
    expect(clasificarRutaPanel("/panel/ventasx")).toBe("panel");
  });
});

describe("destinoTrasLogin", () => {
  test("solo deja volver a rutas de ventas", () => {
    expect(destinoTrasLogin("/panel/ventas/hoy")).toBe("/panel/ventas/hoy");
    expect(destinoTrasLogin("/panel/ventas?mes=2026-09")).toBe("/panel/ventas?mes=2026-09");
    expect(destinoTrasLogin("https://evil.com")).toBe("/panel/ventas");
    expect(destinoTrasLogin("//evil.com/panel/ventas")).toBe("/panel/ventas");
    expect(destinoTrasLogin("/panel/campanas")).toBe("/panel/ventas");
    expect(destinoTrasLogin("/panel/ventas/login")).toBe("/panel/ventas");
    expect(destinoTrasLogin(null)).toBe("/panel/ventas");
  });
});

describe("evaluarAcceso", () => {
  test("sin sesión o inactiva → login; comercial en zona admin → permiso", () => {
    expect(evaluarAcceso(null)).toBe("login");
    expect(evaluarAcceso({ rol: "admin", activa: false })).toBe("login");
    expect(evaluarAcceso({ rol: "comercial", activa: true }, "admin")).toBe("permiso");
    expect(evaluarAcceso({ rol: "comercial", activa: true })).toBe("ok");
    expect(evaluarAcceso({ rol: "admin", activa: true }, "admin")).toBe("ok");
  });
});
