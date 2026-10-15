import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

const m = vi.hoisted(() => ({ setLeadConsent: vi.fn(), verify: vi.fn() }));
vi.mock("@/lib/imagina-leads", () => ({ setLeadConsent: m.setLeadConsent }));
vi.mock("@/lib/unsubscribe-token", () => ({ verifyUnsubscribeToken: m.verify }));

import { GET } from "@/app/api/unsubscribe/route";

const pedir = (q: string) => GET(new NextRequest(`https://www.dinkbit.es/api/unsubscribe?${q}`));

beforeEach(() => {
  m.setLeadConsent.mockReset().mockResolvedValue(undefined);
  m.verify.mockReset();
});

describe("baja de comunicaciones", () => {
  // Los correos enviados antes de unificar el CRM llevan el id de imagina_leads;
  // los nuevos, el de ventas. La ruta pasa el id tal cual: quien lo resuelve
  // (en ventas o, si no está, en imagina_leads) es setLeadConsent.
  test("con un id viejo de imagina_leads da de baja", async () => {
    m.verify.mockReturnValue(true);
    const r = await pedir("id=imagina-viejo-1&token=t");
    expect(await r.text()).toContain("Te has dado de baja");
    expect(m.setLeadConsent).toHaveBeenCalledWith("imagina-viejo-1", false);
  });

  test("con un id de ventas da de baja", async () => {
    m.verify.mockReturnValue(true);
    await pedir("id=0b7c3f7e-1d2a-4c55-9a8e-2b2f1c9d0e11&token=t");
    expect(m.setLeadConsent).toHaveBeenCalledWith("0b7c3f7e-1d2a-4c55-9a8e-2b2f1c9d0e11", false);
  });

  test("con un token que no casa no toca nada", async () => {
    m.verify.mockReturnValue(false);
    const r = await pedir("id=x&token=malo");
    expect(await r.text()).toContain("no válido");
    expect(m.setLeadConsent).not.toHaveBeenCalled();
  });
});
