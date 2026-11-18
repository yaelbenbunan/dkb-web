import { describe, expect, test } from "vitest";
import config from "../../../next.config";

describe("la ruta vieja de Prospección", () => {
  test("/panel/prospeccion lleva a la pestaña de dinkbit en ventas, sin ser permanente", async () => {
    const redirecciones = (await config.redirects?.()) ?? [];
    expect(redirecciones).toContainEqual({
      source: "/panel/prospeccion",
      destination: "/panel/dinkbit/prospeccion",
      permanent: false,
    });
  });

  test("las direcciones de antes del panel siguen llevando a su sitio", async () => {
    const redirecciones = (await config.redirects?.()) ?? [];
    expect(redirecciones).toContainEqual({ source: "/panel/ventas", destination: "/panel", permanent: false });
    expect(redirecciones).toContainEqual({ source: "/panel/ventas/:path*", destination: "/panel/:path*", permanent: false });
    expect(redirecciones).toContainEqual({ source: "/panel/campanas/:path*", destination: "/panel/antiguo/campanas/:path*", permanent: false });
    expect(redirecciones).toContainEqual({ source: "/panel/pdf/:path*", destination: "/panel/antiguo/pdf/:path*", permanent: false });
  });
});
