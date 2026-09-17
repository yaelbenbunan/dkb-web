import { describe, expect, test } from "vitest";
import { describirActividad } from "../ventas/historial";

const nombres = { u1: "Paula" };
const base = { resultado: null, nota: null, datos: {}, usuaria_id: "u1" };

describe("describirActividad", () => {
  test("llamada con resultado, nota y seguimiento", () => {
    expect(
      describirActividad(
        { ...base, tipo: "llamada", resultado: "volver_a_llamar", nota: "Mejor por la tarde", datos: { proximo_seguimiento: "2026-09-20" } },
        nombres,
      ),
    ).toEqual({ titulo: "Llamada · Volver a llamar", detalle: "Mejor por la tarde · Próximo seguimiento: 20/09/2026", autora: "Paula" });
  });

  test("cambio de fase", () => {
    expect(describirActividad({ ...base, tipo: "cambio_fase", datos: { fase_anterior: "nuevo", fase_nueva: "interesado" } }, nombres).titulo).toBe(
      "Fase: Nuevo → Interesado",
    );
  });

  test("lead creado por el sistema desde un anuncio", () => {
    expect(
      describirActividad({ ...base, usuaria_id: null, tipo: "lead_creado", datos: { origen: "anuncio", origen_detalle: "Muestras gimnasios" } }, nombres),
    ).toEqual({ titulo: "Lead creado · Anuncio (Muestras gimnasios)", detalle: null, autora: "Sistema" });
  });

  test("usuaria desconocida y seguimiento borrado", () => {
    const d = describirActividad({ ...base, usuaria_id: "otra", tipo: "muestras_enviadas", datos: { proximo_seguimiento: null } }, nombres);
    expect(d).toEqual({ titulo: "Muestras enviadas", detalle: "Sin seguimiento pendiente", autora: "Usuaria eliminada" });
  });
});
