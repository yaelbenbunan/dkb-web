import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const m = vi.hoisted(() => ({
  refresh: vi.fn(),
  descartarAction: vi.fn(),
  pasarAlEmbudoAction: vi.fn(),
  registrarConsentimientoAction: vi.fn(),
  retirarConsentimientoAction: vi.fn(),
  buscarEmailWebAction: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: m.refresh }) }));
vi.mock("@/app/(site)/panel/ventas/acciones-prospeccion", () => ({
  buscarEmailWebAction: m.buscarEmailWebAction,
  descartarAction: m.descartarAction,
  enviarAction: vi.fn(),
  marcarRespondidoAction: vi.fn(),
  pasarAlEmbudoAction: m.pasarAlEmbudoAction,
  registrarConsentimientoAction: m.registrarConsentimientoAction,
  retirarConsentimientoAction: m.retirarConsentimientoAction,
}));

import { TablaProspectos } from "@/app/(site)/panel/ventas/(app)/[slug]/prospeccion/TablaProspectos";
import type { ProspectRow } from "@/lib/prospeccion/tipos";

const base: ProspectRow = {
  id: "p1",
  search_id: "s1",
  source: "overture",
  external_id: "x1",
  name: "Bar Pepe",
  sector: "Restaurantes",
  address: null,
  city: "Getafe",
  province: null,
  phone: "+34 916 000 000",
  website: "https://barpepe.es",
  email: "info@barpepe.es",
  email_kind: "generica",
  rating: null,
  reviews: null,
  status: "nuevo",
  contact_note: null,
  enriched_at: null,
  template_id: null,
  sent_at: null,
  resend_id: null,
  send_error: null,
  lead_id: null,
  created_at: "2026-10-19T08:00:00Z",
};
const consentido: ProspectRow = {
  ...base,
  id: "p2",
  external_id: "x2",
  name: "Clínica Sol",
  status: "listo",
  consentimiento_at: "2026-10-19T08:00:00Z",
  consentimiento_por: "u1",
  consentimiento_nota: "llamada con la recepcionista",
  consentimiento_retirado_at: null,
};

function pintar(prospectos: ProspectRow[]) {
  render(
    <TablaProspectos
      slug="dinkbit"
      prospectos={prospectos}
      enlaces={{}}
      busquedas={[]}
      plantillas={[]}
      remitentes={[]}
      nombres={{ u1: "Lucía" }}
      cupo={30}
      onAviso={() => {}}
    />,
  );
}

beforeEach(() => vi.clearAllMocks());

describe("TablaProspectos: consentimiento", () => {
  test("la casilla para enviar solo se habilita en quien aceptó recibir información", () => {
    pintar([base, consentido]);
    expect(screen.getByLabelText("Seleccionar Bar Pepe")).toBeDisabled();
    expect(screen.getByLabelText("Seleccionar Clínica Sol")).toBeEnabled();
    expect(screen.getByText(/Aceptó recibir información el 19 de octubre de 2026 \(Lucía\)/)).toBeInTheDocument();
    expect(screen.getByText("llamada con la recepcionista")).toBeInTheDocument();
  });

  test("junto a «Llamar» está el guion, con la Lista Robinson", () => {
    pintar([base]);
    expect(screen.getByText("Qué decir")).toBeInTheDocument();
    expect(screen.getByText(/Lista Robinson/)).toBeInTheDocument();
  });

  test("«Ha aceptado recibir información» pide el email (prerrellenado) y una nota, y lo guarda", async () => {
    m.registrarConsentimientoAction.mockResolvedValue({ ok: true, mensaje: "ok" });
    pintar([base]);
    fireEvent.click(screen.getByRole("button", { name: "Ha aceptado recibir información" }));
    expect(screen.getByLabelText("Email al que escribir")).toHaveValue("info@barpepe.es");
    fireEvent.change(screen.getByLabelText("Nota (opcional)"), { target: { value: "habló el dueño" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar consentimiento" }));
    await waitFor(() =>
      expect(m.registrarConsentimientoAction).toHaveBeenCalledWith("dinkbit", "p1", "info@barpepe.es", "habló el dueño"),
    );
  });

  test("«Buscar en su web» solo rellena el campo", async () => {
    m.buscarEmailWebAction.mockResolvedValue({ ok: true, email: "hola@barpepe.es" });
    pintar([{ ...base, email: null }]);
    fireEvent.click(screen.getByRole("button", { name: "Ha aceptado recibir información" }));
    fireEvent.click(screen.getByRole("button", { name: "Buscar en su web" }));
    await waitFor(() => expect(screen.getByLabelText("Email al que escribir")).toHaveValue("hola@barpepe.es"));
    expect(m.registrarConsentimientoAction).not.toHaveBeenCalled();
  });

  test("cada fila tiene su «Descartar» (dijo que no en la llamada)", async () => {
    m.descartarAction.mockResolvedValue({ ok: true, mensaje: "1 descartada." });
    pintar([base]);
    fireEvent.click(screen.getByRole("button", { name: "Descartar Bar Pepe" }));
    await waitFor(() => expect(m.descartarAction).toHaveBeenCalledWith("dinkbit", ["p1"]));
  });

  test("«Pasar al embudo» justo tras la llamada si aceptó; sin consentimiento, no", async () => {
    m.pasarAlEmbudoAction.mockResolvedValue({ ok: true, mensaje: "ok" });
    pintar([base, consentido]);
    const botones = screen.getAllByRole("button", { name: "Pasar al embudo" });
    expect(botones).toHaveLength(1);
    fireEvent.click(botones[0]);
    await waitFor(() => expect(m.pasarAlEmbudoAction).toHaveBeenCalledWith("dinkbit", "p2"));
  });

  test("se puede retirar: «Ya no quiere recibir información»", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    m.retirarConsentimientoAction.mockResolvedValue({ ok: true, mensaje: "ok" });
    pintar([consentido]);
    expect(screen.queryByRole("button", { name: "Ha aceptado recibir información" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ya no quiere recibir información" }));
    await waitFor(() => expect(m.retirarConsentimientoAction).toHaveBeenCalledWith("dinkbit", "p2"));
  });
});
