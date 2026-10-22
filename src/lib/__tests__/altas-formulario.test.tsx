import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const m = vi.hoisted(() => ({ enviarAltaAction: vi.fn(), pedirSubidaAction: vi.fn(), quitarArchivoAction: vi.fn(), confirmarSubidaAction: vi.fn() }));
vi.mock("@/app/(alta)/alta/[token]/acciones", () => m);

import { FormularioAlta } from "@/app/(alta)/alta/[token]/FormularioAlta";
import { claveBorrador, guardarBorrador } from "@/lib/altas/borrador";

const TOKEN = "E".repeat(43);
const RUTA_NUEVA = "11111111-2222-4333-8444-555555555555/diseno/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee-logo.svg";
const RUTA_GUARDADA = "11111111-2222-4333-8444-555555555555/diseno/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee0-viejo.svg";

function pintar(extra: Partial<Parameters<typeof FormularioAlta>[0]> = {}) {
  return render(<FormularioAlta token={TOKEN} cliente="Nubosoft" respuestas={{}} archivos={[]} enviadaEn={null} {...extra} />);
}

beforeEach(() => {
  localStorage.clear();
  Object.values(m).forEach((f) => f.mockReset());
  m.quitarArchivoAction.mockResolvedValue({ ok: true });
});
afterEach(() => vi.useRealTimers());

describe("FormularioAlta: borrador local", () => {
  test("avisa de que se guarda en el navegador", () => {
    pintar();
    expect(screen.getByText("Tus respuestas se guardan en este navegador hasta que las envíes.")).toBeInTheDocument();
  });

  test("recupera el borrador al abrir", () => {
    guardarBorrador(TOKEN, { valores: { contacto_nombre: "Laura del borrador" }, archivos: [] });
    pintar({ respuestas: { contacto_nombre: "Lo enviado" } });
    expect(screen.getByLabelText(/Nombre de la persona de contacto/)).toHaveValue("Laura del borrador");
  });

  test("guarda lo escrito un momento después", () => {
    vi.useFakeTimers();
    pintar();
    fireEvent.change(screen.getByLabelText(/Nombre de la persona de contacto/), { target: { value: "Laura" } });
    expect(localStorage.getItem(claveBorrador(TOKEN))).toBeNull();
    act(() => vi.advanceTimersByTime(1000));
    expect(JSON.parse(localStorage.getItem(claveBorrador(TOKEN)) ?? "{}").valores.contacto_nombre).toBe("Laura");
  });

  test("quitar un archivo recién subido lo borra del servidor; uno ya enviado, no", () => {
    guardarBorrador(TOKEN, { valores: {}, archivos: [{ campo: "logo", ruta: RUTA_NUEVA, nombre: "logo.svg", tamano: 10 }, { campo: "logo", ruta: RUTA_GUARDADA, nombre: "viejo.svg", tamano: 10 }] }, new Date("2026-10-22T12:00:00Z"));
    pintar({ archivos: [{ campo: "logo", ruta: RUTA_GUARDADA, nombre: "viejo.svg", tamano: 10 }], enviadaEn: "2026-10-22T10:00:00Z" });
    const botones = screen.getAllByRole("button", { name: "Quitar" });
    fireEvent.click(botones[0]);
    expect(m.quitarArchivoAction).toHaveBeenCalledWith(TOKEN, RUTA_NUEVA);
    fireEvent.click(screen.getByRole("button", { name: "Quitar" }));
    expect(m.quitarArchivoAction).toHaveBeenCalledTimes(1);
  });

  test("al enviar bien, se borra el borrador", async () => {
    const valores = {
      contacto_nombre: "Laura", contacto_email: "laura@nubosoft.es", contacto_telefono: "600000000", razon_social: "Nubosoft S.L.", cif: "B12345678",
      direccion_facturacion: "Calle Mayor 1", email_facturas: "f@nubosoft.es", servicios: "Software", diferencia: "Soporte", tipo_cliente: "b2b",
      cliente_ideal: "Pymes", zona: "espana", presupuesto: "a_definir", forma_pago: "tarjeta", consentimiento_marca: true,
    };
    guardarBorrador(TOKEN, { valores, archivos: [{ campo: "logo", ruta: RUTA_NUEVA, nombre: "logo.svg", tamano: 10 }] });
    m.enviarAltaAction.mockResolvedValue({ ok: true });
    window.scrollTo = vi.fn();
    pintar();
    fireEvent.click(screen.getByRole("button", { name: "Enviar alta" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "¡Gracias, Nubosoft!" })).toBeInTheDocument());
    expect(m.enviarAltaAction).toHaveBeenCalledWith(TOKEN, expect.objectContaining({ contacto_nombre: "Laura" }), [{ campo: "logo", ruta: RUTA_NUEVA, nombre: "logo.svg" }], []);
    expect(localStorage.getItem(claveBorrador(TOKEN))).toBeNull();
  });
});
