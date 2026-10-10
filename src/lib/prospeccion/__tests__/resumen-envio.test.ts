import { describe, expect, test } from "vitest";
import { resumirOmitidos } from "../resumen-envio";

const textos = {
  suprimido: "Pidió no recibir más correos, o su dirección rebotó.",
  faltan_datos: "A la empresa le falta un dato que la plantilla usa",
  tope_diario: "Se alcanzó el tope de envíos de hoy.",
};

describe("resumirOmitidos", () => {
  test("agrupa por motivo, con su cuenta y el detalle", () => {
    expect(
      resumirOmitidos(
        [
          { motivo: "suprimido" },
          { motivo: "faltan_datos", detalle: "ciudad" },
          { motivo: "suprimido" },
        ],
        textos,
      ),
    ).toBe(
      "2 — Pidió no recibir más correos, o su dirección rebotó. 1 — A la empresa le falta un dato que la plantilla usa: ciudad.",
    );
  });
  test("no duplica el punto final", () => {
    expect(resumirOmitidos([{ motivo: "tope_diario" }], textos)).toBe("1 — Se alcanzó el tope de envíos de hoy.");
  });
  test("los detalles repetidos aparecen una vez", () => {
    expect(
      resumirOmitidos(
        [
          { motivo: "faltan_datos", detalle: "ciudad" },
          { motivo: "faltan_datos", detalle: "ciudad" },
          { motivo: "faltan_datos", detalle: "web" },
        ],
        textos,
      ),
    ).toBe("3 — A la empresa le falta un dato que la plantilla usa: ciudad; web.");
  });
  test("sin omitidos, cadena vacía", () => expect(resumirOmitidos([], textos)).toBe(""));
});
