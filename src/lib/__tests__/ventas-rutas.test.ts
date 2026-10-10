import { describe, expect, test } from "vitest";
import { clasificarRutaPanel, destinoTrasLogin, evaluarAcceso, evaluarAccesoMarca } from "../ventas/rutas";

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

describe("evaluarAccesoMarca", () => {
  const admin = { rol: "admin", activa: true, marca_id: null };
  const comercial = { rol: "comercial", activa: true, marca_id: null };
  const cliente = { rol: "cliente", activa: true, marca_id: "m1" };

  test("admin y comercial entran en cualquier marca y sección", () => {
    for (const u of [admin, comercial]) {
      expect(evaluarAccesoMarca(u, "m1", "condiciones")).toBe("ok");
      expect(evaluarAccesoMarca(u, "m2", "tareas")).toBe("ok");
    }
  });

  test("la clienta solo entra en las cuatro secciones de su marca", () => {
    for (const s of ["resumen", "tablero", "leads", "tareas"] as const) {
      expect(evaluarAccesoMarca(cliente, "m1", s)).toBe("ok");
    }
    for (const s of ["secuencias", "conversaciones", "condiciones"] as const) {
      expect(evaluarAccesoMarca(cliente, "m1", s)).toBe("permiso");
    }
  });

  test("la clienta no entra en una marca ajena, ni si no tiene marca", () => {
    expect(evaluarAccesoMarca(cliente, "m2", "leads")).toBe("permiso");
    expect(evaluarAccesoMarca({ ...cliente, marca_id: null }, "m1", "leads")).toBe("permiso");
  });

  test("sin sesión o desactivada va al login", () => {
    expect(evaluarAccesoMarca(null, "m1", "leads")).toBe("login");
    expect(evaluarAccesoMarca({ ...cliente, activa: false }, "m1", "leads")).toBe("login");
  });
});

describe("evaluarAcceso con rol «equipo»", () => {
  test("deja pasar a admin y comercial, no a la clienta", () => {
    expect(evaluarAcceso({ rol: "admin", activa: true }, "equipo")).toBe("ok");
    expect(evaluarAcceso({ rol: "comercial", activa: true }, "equipo")).toBe("ok");
    expect(evaluarAcceso({ rol: "cliente", activa: true }, "equipo")).toBe("permiso");
  });
  test("la clienta nunca pasa por admin", () => {
    expect(evaluarAcceso({ rol: "cliente", activa: true }, "admin")).toBe("permiso");
  });
});
