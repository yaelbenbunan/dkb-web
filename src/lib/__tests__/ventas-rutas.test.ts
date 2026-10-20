import { describe, expect, test } from "vitest";
import {
  clasificarRutaPanel,
  destinoTrasLogin,
  esAsignableEnMarca,
  evaluarAcceso,
  evaluarAccesoMarca,
  inicioDeMarca,
  puedeConectarWhatsApp,
  rolConMarca,
  seccionesDeRol,
  tieneProspeccion,
} from "../ventas/rutas";

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
      expect(evaluarAccesoMarca(u, "m2", "campanas")).toBe("ok");
      expect(evaluarAccesoMarca(u, "m1", "prospeccion")).toBe("ok");
    }
  });

  test("la clienta solo entra en sus secciones de su marca", () => {
    for (const s of ["resumen", "tablero", "leads", "tareas", "conversaciones", "whatsapp"] as const) {
      expect(evaluarAccesoMarca(cliente, "m1", s)).toBe("ok");
    }
    for (const s of ["secuencias", "condiciones", "campanas", "prospeccion"] as const) {
      expect(evaluarAccesoMarca(cliente, "m1", s)).toBe("permiso");
    }
  });

  test("la clienta no entra en una marca ajena, ni si no tiene marca", () => {
    expect(evaluarAccesoMarca(cliente, "m2", "leads")).toBe("permiso");
    expect(evaluarAccesoMarca({ ...cliente, marca_id: null }, "m1", "leads")).toBe("permiso");
  });

  test("un rol desconocido no entra en ninguna sección", () => {
    const invitada = { rol: "invitada", activa: true, marca_id: "m1" };
    for (const s of ["resumen", "tablero", "leads", "tareas", "secuencias", "conversaciones", "condiciones"] as const) {
      expect(evaluarAccesoMarca(invitada, "m1", s)).toBe("permiso");
    }
  });

  test("sin sesión o desactivada va al login", () => {
    expect(evaluarAccesoMarca(null, "m1", "leads")).toBe("login");
    expect(evaluarAccesoMarca({ ...cliente, activa: false }, "m1", "leads")).toBe("login");
  });
});

describe("tieneProspeccion", () => {
  test("solo dinkbit: el envío habla en su nombre", () => {
    expect(tieneProspeccion("dinkbit")).toBe(true);
    expect(tieneProspeccion("hydrup")).toBe(false);
    expect(tieneProspeccion("")).toBe(false);
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

describe("esAsignableEnMarca", () => {
  const u = (rol: string, activa = true, marca_id: string | null = null) => ({ rol, activa, marca_id });
  test("admin y comercial activas se pueden asignar en cualquier marca", () => {
    expect(esAsignableEnMarca(u("admin"), "m1")).toBe(true);
    expect(esAsignableEnMarca(u("comercial"), "m1")).toBe(true);
  });
  test("la clienta solo en su marca", () => {
    expect(esAsignableEnMarca(u("cliente", true, "m1"), "m1")).toBe(true);
    expect(esAsignableEnMarca(u("cliente", true, "m2"), "m1")).toBe(false);
    expect(esAsignableEnMarca(u("cliente", true, null), "m1")).toBe(false);
  });
  test("desactivada nunca, ni siendo admin", () => {
    expect(esAsignableEnMarca(u("admin", false), "m1")).toBe(false);
    expect(esAsignableEnMarca(u("cliente", false, "m1"), "m1")).toBe(false);
  });
  test("un rol desconocido no", () => {
    expect(esAsignableEnMarca(u("invitada", true, "m1"), "m1")).toBe(false);
  });
});

describe("rol «agente» (solo conversaciones)", () => {
  const agente = { rol: "agente", activa: true, marca_id: "m1" };

  test("solo entra en Conversaciones de su marca", () => {
    expect(evaluarAccesoMarca(agente, "m1", "conversaciones")).toBe("ok");
    for (const s of ["resumen", "tablero", "leads", "tareas", "secuencias", "condiciones", "campanas", "prospeccion"] as const) {
      expect(evaluarAccesoMarca(agente, "m1", s)).toBe("permiso");
    }
  });

  test("no entra en una marca ajena, ni sin marca", () => {
    expect(evaluarAccesoMarca(agente, "m2", "conversaciones")).toBe("permiso");
    expect(evaluarAccesoMarca({ ...agente, marca_id: null }, "m1", "conversaciones")).toBe("permiso");
  });

  test("no entra en las páginas del equipo ni de admin", () => {
    expect(evaluarAcceso(agente, "equipo")).toBe("permiso");
    expect(evaluarAcceso(agente, "admin")).toBe("permiso");
  });

  test("no se le pueden asignar leads ni tareas", () => {
    expect(esAsignableEnMarca(agente, "m1")).toBe(false);
  });

  test("sus pestañas y su página de inicio", () => {
    expect(seccionesDeRol("agente")).toEqual(["conversaciones"]);
    expect(seccionesDeRol("cliente")).toEqual(["resumen", "tablero", "leads", "tareas", "conversaciones", "whatsapp"]);
    expect(seccionesDeRol("admin")).toBeNull();
    expect(inicioDeMarca("agente", "dinkbit")).toBe("/panel/ventas/dinkbit/conversaciones");
    expect(inicioDeMarca("cliente", "hydrup")).toBe("/panel/ventas/hydrup");
  });

  test("qué roles van ligados a una marca", () => {
    expect(rolConMarca("cliente")).toBe(true);
    expect(rolConMarca("agente")).toBe(true);
    expect(rolConMarca("admin")).toBe(false);
    expect(rolConMarca("comercial")).toBe(false);
  });
});

describe("puedeConectarWhatsApp", () => {
  const admin = { rol: "admin", activa: true, marca_id: null };
  const comercial = { rol: "comercial", activa: true, marca_id: null };
  const cliente = { rol: "cliente", activa: true, marca_id: "m1" };
  const agente = { rol: "agente", activa: true, marca_id: "m1" };

  test("admin conecta cualquier marca", () => {
    expect(puedeConectarWhatsApp(admin, "m1")).toBe(true);
    expect(puedeConectarWhatsApp(admin, "m2")).toBe(true);
  });

  test("la clienta solo su marca", () => {
    expect(puedeConectarWhatsApp(cliente, "m1")).toBe(true);
    expect(puedeConectarWhatsApp(cliente, "m2")).toBe(false);
    expect(puedeConectarWhatsApp({ ...cliente, marca_id: null }, "m1")).toBe(false);
  });

  test("comercial y agente no conectan, aunque vean la sección", () => {
    expect(evaluarAccesoMarca(comercial, "m1", "whatsapp")).toBe("ok");
    expect(puedeConectarWhatsApp(comercial, "m1")).toBe(false);
    expect(puedeConectarWhatsApp(agente, "m1")).toBe(false);
  });

  test("la agente no entra en la sección", () => {
    expect(evaluarAccesoMarca(agente, "m1", "whatsapp")).toBe("permiso");
  });

  test("una usuaria desactivada no conecta", () => {
    expect(puedeConectarWhatsApp({ ...admin, activa: false }, "m1")).toBe(false);
    expect(puedeConectarWhatsApp({ ...cliente, activa: false }, "m1")).toBe(false);
  });
});
