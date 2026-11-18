import { describe, expect, test } from "vitest";
import { agruparProyectos, elegirDePlantilla, limpiarServicios, nombreServicio, pendientesDePlantilla, SERVICIOS, tareasDePlantilla } from "../ventas/proyectos";

describe("catálogo de servicios", () => {
  test("claves únicas y cada plantilla con tareas sin repetir", () => {
    const claves = SERVICIOS.map((s) => s.clave);
    expect(new Set(claves).size).toBe(claves.length);
    for (const s of SERVICIOS) {
      const titulos = tareasDePlantilla(s.clave).map((t) => t.titulo);
      expect(titulos.length).toBeGreaterThan(0);
      // El título identifica la tarea dentro del proyecto (pendientesDePlantilla): no puede repetirse.
      expect(new Set(titulos).size).toBe(titulos.length);
      for (const t of titulos) expect(t.length).toBeLessThanOrEqual(200);
    }
  });

  test("limpiarServicios: solo claves reales, sin repetir, en el orden del catálogo", () => {
    expect(limpiarServicios(["rrss", "web", "inventado", "web", 3])).toEqual(["web", "rrss"]);
  });

  test("nombreServicio cae en la clave si no existe", () => {
    expect(nombreServicio("web")).toBe("Web");
    expect(nombreServicio("otro")).toBe("otro");
  });
});

describe("plantillas", () => {
  test("cada tarea sabe su proyecto, fase y orden", () => {
    const web = tareasDePlantilla("web");
    expect(web[0]).toEqual({ proyecto: "web", fase: "Arranque", titulo: "Revisar el alta y los archivos del cliente", orden: 0, clave: "web:0" });
    expect(web.map((t) => t.orden)).toEqual(web.map((_, i) => i));
    expect(tareasDePlantilla("no-existe")).toEqual([]);
  });

  test("pendientes: las que el cliente aún no tiene en ese proyecto", () => {
    const existentes = [
      { proyecto: "web", titulo: "Reunión de arranque" },
      { proyecto: "rrss", titulo: "Reunión de arranque" },
      { proyecto: null, titulo: "Diseño de la home" },
    ];
    const pendientes = pendientesDePlantilla("web", existentes).map((t) => t.titulo);
    expect(pendientes).not.toContain("Reunión de arranque");
    // Una tarea suelta con el mismo título no cuenta como hecha de la plantilla.
    expect(pendientes).toContain("Diseño de la home");
  });

  test("elegir: solo las marcadas, ni inventadas ni ya añadidas", () => {
    const r = elegirDePlantilla("web", ["web:0", "web:1", "web:99", "rrss:0", 7], [{ proyecto: "web", titulo: "Reunión de arranque" }]);
    expect(r.map((t) => t.clave)).toEqual(["web:0"]);
  });
});

describe("agruparProyectos", () => {
  test("por proyecto en el orden del catálogo y por fase en el de la plantilla", () => {
    const t = (id: string, proyecto: string | null, fase: string | null, orden: number, hecha = false) => ({
      id,
      proyecto,
      fase,
      orden,
      titulo: id,
      hecha_at: hecha ? "2026-11-18T10:00:00Z" : null,
    });
    const r = agruparProyectos([t("r1", "rrss", "Arranque", 0), t("w3", "web", "Diseño", 3, true), t("w0", "web", "Arranque", 0, true), t("suelta", null, null, 0), t("w1", "web", "Arranque", 1)]);
    expect(r.map((p) => p.clave)).toEqual(["web", "rrss"]);
    expect(r[0]).toMatchObject({ nombre: "Web", total: 3, hechas: 2 });
    expect(r[0].fases.map((f) => [f.nombre, f.tareas.map((x) => x.id), f.hechas])).toEqual([
      ["Arranque", ["w0", "w1"], 1],
      ["Diseño", ["w3"], 1],
    ]);
  });
});
