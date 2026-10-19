import { afterEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

const importarBorme = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prospeccion/importar-borme", () => ({ importarBorme }));

import { GET } from "@/app/api/cron/borme/route";

const peticion = (auth?: string) =>
  new NextRequest("https://www.dinkbit.es/api/cron/borme", { headers: auth ? { authorization: auth } : {} });

describe("/api/cron/borme", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    importarBorme.mockReset();
  });

  test("sin el secreto correcto no importa nada", async () => {
    vi.stubEnv("CRON_SECRET", "secreto-del-cron-largo");
    expect((await GET(peticion())).status).toBe(401);
    expect((await GET(peticion("Bearer otro"))).status).toBe(401);
    expect(importarBorme).not.toHaveBeenCalled();
  });

  test("con el secreto importa los últimos 10 días", async () => {
    vi.stubEnv("CRON_SECRET", "secreto-del-cron-largo");
    importarBorme.mockResolvedValue({ ok: true, dias: 10, constituciones: 3000 });
    const res = await GET(peticion("Bearer secreto-del-cron-largo"));
    expect(res.status).toBe(200);
    expect(importarBorme).toHaveBeenCalledWith({ dias: 10 });
  });
});
