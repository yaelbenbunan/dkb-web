import { beforeEach, describe, expect, test, vi } from "vitest";

const m = vi.hoisted(() => ({ accesoMarcaAccion: vi.fn(), getProspecto: vi.fn() }));
vi.mock("@/lib/ventas/auth", () => ({ accesoMarcaAccion: m.accesoMarcaAccion }));
vi.mock("@/lib/prospeccion/db", () => ({ getProspecto: m.getProspecto }));

import { GET } from "@/app/(site)/panel/ventas/(app)/[slug]/prospeccion/carta/[id]/route";

const ID = "0a1b2c3d-0000-4000-8000-000000000001";
const llamar = (slug = "dinkbit", id = ID) => GET(new Request("http://x"), { params: Promise.resolve({ slug, id }) });
const BORME = { id: ID, source: "borme", name: "X SL", address: "C/ A 1, Getafe", city: "Getafe", province: "Madrid" };

beforeEach(() => {
  vi.clearAllMocks();
  m.accesoMarcaAccion.mockResolvedValue({ ok: true, usuaria: { rol: "comercial" }, marca: { slug: "dinkbit" } });
  m.getProspecto.mockResolvedValue(BORME);
});

describe("carta de una empresa nueva", () => {
  test("con acceso, el PDF", async () => {
    const r = await llamar();
    expect(r.status).toBe(200);
    expect(r.headers.get("Content-Type")).toBe("application/pdf");
    expect(m.accesoMarcaAccion).toHaveBeenCalledWith("dinkbit", "prospeccion");
  });

  test("sin permiso, nada", async () => {
    m.accesoMarcaAccion.mockResolvedValue({ ok: false, error: "No tienes permiso para esto." });
    expect((await llamar()).status).toBe(403);
    expect(m.getProspecto).not.toHaveBeenCalled();
  });

  test("marca sin prospección o empresa que no es del BORME: 404", async () => {
    m.accesoMarcaAccion.mockResolvedValue({ ok: true, usuaria: {}, marca: { slug: "hydrup" } });
    expect((await llamar("hydrup")).status).toBe(404);
    m.accesoMarcaAccion.mockResolvedValue({ ok: true, usuaria: {}, marca: { slug: "dinkbit" } });
    m.getProspecto.mockResolvedValue({ ...BORME, source: "overture" });
    expect((await llamar()).status).toBe(404);
    expect((await llamar("dinkbit", "no-es-un-uuid")).status).toBe(404);
  });
});
