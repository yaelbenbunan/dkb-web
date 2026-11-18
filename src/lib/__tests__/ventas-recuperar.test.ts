import { beforeEach, describe, expect, test, vi } from "vitest";
import { emailDeRecuperacion, origenDeVuelta } from "../ventas/recuperar";

const m = vi.hoisted(() => ({
  reset: vi.fn(),
  getUser: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
  getUsuaria: vi.fn(),
  cabeceras: new Map<string, string>(),
  sinConfig: false,
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
vi.mock("next/headers", () => ({ headers: async () => ({ get: (k: string) => m.cabeceras.get(k) ?? null }) }));
vi.mock("@/lib/ventas/auth", () => ({
  crearClienteSesion: async () =>
    m.sinConfig
      ? null
      : { auth: { resetPasswordForEmail: m.reset, getUser: m.getUser, updateUser: m.updateUser, signOut: m.signOut } },
}));
vi.mock("@/lib/ventas/db", () => ({ getUsuaria: m.getUsuaria }));

import { guardarContrasenaNueva, pedirRecuperacion } from "@/app/(site)/panel/ventas/login/recuperar/acciones";

function fd(campos: Record<string, string>): FormData {
  const f = new FormData();
  Object.entries(campos).forEach(([k, v]) => f.set(k, v));
  return f;
}
async function destino(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    return String((e as Error).message).replace("REDIRECT:", "");
  }
  throw new Error("no redirigió");
}

describe("origenDeVuelta", () => {
  test("producción, versiones de prueba y el ordenador", () => {
    expect(origenDeVuelta("www.dinkbit.es", "https")).toBe("https://www.dinkbit.es");
    expect(origenDeVuelta("dinkbit.es", "https")).toBe("https://www.dinkbit.es");
    expect(origenDeVuelta("dkb-6o905t84c-yaelbenbunans-projects.vercel.app", "https")).toBe("https://dkb-6o905t84c-yaelbenbunans-projects.vercel.app");
    expect(origenDeVuelta("localhost:3000", "http")).toBe("http://localhost:3000");
  });
  test("cualquier otra cabecera Host acaba en producción", () => {
    expect(origenDeVuelta("malo.example", "https")).toBe("https://www.dinkbit.es");
    expect(origenDeVuelta("dkb-x.vercel.app.malo.example", "https")).toBe("https://www.dinkbit.es");
    expect(origenDeVuelta(null, null)).toBe("https://www.dinkbit.es");
  });
});

describe("emailDeRecuperacion", () => {
  test("limpia y valida", () => {
    expect(emailDeRecuperacion("  Yael@Dinkbit.com ")).toBe("yael@dinkbit.com");
    expect(emailDeRecuperacion("sin-arroba")).toBeNull();
    expect(emailDeRecuperacion(null)).toBeNull();
  });
});

describe("pedirRecuperacion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.cabeceras = new Map([["host", "www.dinkbit.es"]]);
    m.sinConfig = false;
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  test("pide el correo con la vuelta a esta misma web", async () => {
    m.reset.mockResolvedValue({ error: null });
    expect(await destino(pedirRecuperacion(fd({ email: "Yael@dinkbit.com" })))).toBe("/panel/ventas/login/recuperar?enviado=1");
    expect(m.reset).toHaveBeenCalledWith("yael@dinkbit.com", { redirectTo: "https://www.dinkbit.es/panel/ventas/login/recuperar/vuelta" });
  });

  test("responde igual aunque Supabase falle: no revela qué emails tienen cuenta", async () => {
    m.reset.mockResolvedValue({ error: { message: "User not found" } });
    expect(await destino(pedirRecuperacion(fd({ email: "nadie@x.com" })))).toBe("/panel/ventas/login/recuperar?enviado=1");
  });

  test("un email mal escrito no llega a Supabase", async () => {
    expect(await destino(pedirRecuperacion(fd({ email: "x" })))).toBe("/panel/ventas/login/recuperar?error=email");
    expect(m.reset).not.toHaveBeenCalled();
  });
});

describe("guardarContrasenaNueva", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.sinConfig = false;
    vi.spyOn(console, "error").mockImplementation(() => {});
    m.getUser.mockResolvedValue({ data: { user: { id: "u1", email: "yael@dinkbit.com" } } });
    m.updateUser.mockResolvedValue({ error: null });
    m.getUsuaria.mockResolvedValue({ id: "u1", activa: true });
  });

  test("guarda y entra al panel", async () => {
    expect(await destino(guardarContrasenaNueva(fd({ password: "una-buena-clave", repetida: "una-buena-clave" })))).toBe("/panel/ventas");
    expect(m.updateUser).toHaveBeenCalledWith({ password: "una-buena-clave" });
  });

  test("las dos tienen que coincidir y tener 10 caracteres", async () => {
    expect(await destino(guardarContrasenaNueva(fd({ password: "una-buena-clave", repetida: "otra" })))).toBe("/panel/ventas/login/nueva?error=distintas");
    expect(await destino(guardarContrasenaNueva(fd({ password: "corta", repetida: "corta" })))).toBe("/panel/ventas/login/nueva?error=corta");
    expect(m.updateUser).not.toHaveBeenCalled();
  });

  test("sin la sesión del enlace no cambia nada", async () => {
    m.getUser.mockResolvedValue({ data: { user: null } });
    expect(await destino(guardarContrasenaNueva(fd({ password: "una-buena-clave", repetida: "una-buena-clave" })))).toBe("/panel/ventas/login/recuperar?error=enlace");
    expect(m.updateUser).not.toHaveBeenCalled();
  });

  test("una cuenta desactivada cambia la contraseña pero no entra", async () => {
    m.getUsuaria.mockResolvedValue({ id: "u1", activa: false });
    expect(await destino(guardarContrasenaNueva(fd({ password: "una-buena-clave", repetida: "una-buena-clave" })))).toBe("/panel/ventas/login?error=inactiva");
    expect(m.signOut).toHaveBeenCalled();
  });
});
