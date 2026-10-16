import { describe, expect, test } from "vitest";
import config from "../../../next.config";

describe("la ruta vieja de Prospección", () => {
  test("/panel/prospeccion lleva a la pestaña de dinkbit en ventas, sin ser permanente", async () => {
    const redirecciones = (await config.redirects?.()) ?? [];
    expect(redirecciones).toContainEqual({
      source: "/panel/prospeccion",
      destination: "/panel/ventas/dinkbit/prospeccion",
      permanent: false,
    });
  });
});
