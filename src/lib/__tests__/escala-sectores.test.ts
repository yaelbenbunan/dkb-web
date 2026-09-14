import { describe, expect, test } from "vitest";
import {
  GENERAL,
  SECTORES_ESCALA,
  SECTORES_FORMULARIO,
  sectorPorSlug,
} from "../escala-sectores";

describe("las landings por sector", () => {
  test("el sector preseleccionado existe en el desplegable", () => {
    // **El fallo que este test existe para atrapar.** El formulario preselecciona
    // comparando texto exacto: si aquí pusiera "Fisioterapeutas" y el desplegable
    // dijera "Fisioterapia", el `<select>` se quedaría en blanco. No se rompe
    // nada visible —la página carga igual— y el lead llega sin etiquetar, que es
    // justo lo que estas páginas venían a arreglar.
    for (const s of SECTORES_ESCALA) {
      expect(SECTORES_FORMULARIO).toContain(s.valorFormulario);
    }
  });

  test("los slugs son únicos y válidos para una URL", () => {
    const slugs = SECTORES_ESCALA.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9-]+$/);
  });

  test("la general no es una ruta hija", () => {
    // Vive en /escala a secas. Si se colara en la lista, se generaría
    // /escala/ con slug vacío y habría dos URLs sirviendo la misma página.
    expect(GENERAL.slug).toBe("");
    expect(SECTORES_ESCALA).not.toContain(GENERAL);
  });

  test("un sector que no existe no resuelve", () => {
    expect(sectorPorSlug("veterinaria")).toBeUndefined();
    expect(sectorPorSlug("")).toBeUndefined();
    expect(sectorPorSlug("dental")?.slug).toBe("dental");
  });

  test("cada sector trae preguntas propias, que es lo que justifica su página", () => {
    // Una landing de sector sin preguntas de su gremio es la landing general con
    // el título cambiado, y para eso no hace falta una URL aparte.
    for (const s of SECTORES_ESCALA) {
      expect(s.preguntas.length).toBeGreaterThan(0);
    }
  });

  test("cada sector llama a su gente como la llama su gremio", () => {
    // Un centro de estética no tiene pacientes. Es una palabra, y es la que
    // delata si la página está escrita para ellos.
    const estetica = sectorPorSlug("estetica");
    expect(estetica?.termino.plural).toBe("clientes");
    expect(sectorPorSlug("psicologia")?.termino.plural).toBe("pacientes");
    // Y el rótulo de la comparativa tampoco puede decir "Clínica" a todos.
    expect(sectorPorSlug("psicologia")?.negocio).toBe("Consulta");
    expect(estetica?.negocio).toBe("Centro");
  });

  test("la general conserva las cifras que ya estaban publicadas", () => {
    // Extraer el cuerpo a un componente compartido no podía cambiar la página
    // que ya recibe tráfico. Si alguien toca estos números, que sea a propósito.
    expect(GENERAL.ticket).toBe("250 €");
    expect(GENERAL.sinEscala.queda).toBe("2.000 €");
    expect(GENERAL.conEscala.queda).toBe("4.000 €");
    expect(GENERAL.titular.primera).toBe("Llenar tu agenda es fácil.");
    // Y no lleva eyebrow: no tiene a quién señalar.
    expect(GENERAL.eyebrow).toBeUndefined();
  });
});
