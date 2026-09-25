import { describe, expect, test } from "vitest";
import {
  GENERAL,
  SECTORES_GROWTH,
  SECTORES_FORMULARIO,
  sectorPorSlug,
} from "../growth-sectores";

describe("las landings por sector", () => {
  test("el sector preseleccionado existe en el desplegable", () => {
    // **El fallo que este test existe para atrapar.** El formulario preselecciona
    // comparando texto exacto: si aquí pusiera "Fisioterapeutas" y el desplegable
    // dijera "Fisioterapia", el `<select>` se quedaría en blanco. No se rompe
    // nada visible —la página carga igual— y el lead llega sin etiquetar, que es
    // justo lo que estas páginas venían a arreglar.
    for (const s of SECTORES_GROWTH) {
      expect(SECTORES_FORMULARIO).toContain(s.valorFormulario);
    }
  });

  test("los slugs son únicos y válidos para una URL", () => {
    const slugs = SECTORES_GROWTH.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9-]+$/);
  });

  test("la general no es una ruta hija", () => {
    // Vive en /growth a secas. Si se colara en la lista, se generaría
    // /growth/ con slug vacío y habría dos URLs sirviendo la misma página.
    expect(GENERAL.slug).toBe("");
    expect(SECTORES_GROWTH).not.toContain(GENERAL);
  });

  test("un sector que no existe no resuelve", () => {
    expect(sectorPorSlug("veterinaria")).toBeUndefined();
    expect(sectorPorSlug("")).toBeUndefined();
    expect(sectorPorSlug("dental")?.slug).toBe("dental");
  });

  test("cada sector trae preguntas propias, que es lo que justifica su página", () => {
    // Una landing de sector sin preguntas de su gremio es la landing general con
    // el título cambiado, y para eso no hace falta una URL aparte.
    for (const s of SECTORES_GROWTH) {
      expect(s.preguntas.length).toBeGreaterThan(0);
    }
  });

  test("cada sector llama a su gente como la llama su gremio", () => {
    // Un centro de estética no tiene pacientes. Es una palabra, y es la que
    // delata si la página está escrita para ellos.
    expect(sectorPorSlug("estetica")?.termino.plural).toBe("clientes");
    expect(sectorPorSlug("psicologia")?.termino.plural).toBe("pacientes");
  });

  test("a todos se les vende agenda llena, no dinero", () => {
    // Decidido el 25 de septiembre de 2026: Growth llena la agenda. Si alguien
    // recupera la cabecera de «ganar más», esto lo caza antes de publicarlo.
    for (const s of [GENERAL, ...SECTORES_GROWTH]) {
      const cabecera = JSON.stringify([s.metaTitulo, s.metaDescripcion, s.titular, s.subtitulo]);
      expect(cabecera, s.slug || "general").not.toMatch(
        /ganar|beneficio|dinero|rentabilidad|factura/i,
      );
    }
  });

  test("ninguna promete lo que Growth ya no incluye", () => {
    // Growth es landing, campañas y análisis. El sistema de pacientes, la
    // agenda conectada, el panel y los recordatorios salieron de la oferta el
    // 25 de septiembre de 2026, y una landing que los siga prometiendo vende
    // algo que no se entrega.
    for (const s of [GENERAL, ...SECTORES_GROWTH]) {
      const todo = JSON.stringify(s);
      expect(todo, s.slug || "general").not.toMatch(
        /tu sistema|en el sistema|CRM|panel|recordatorio|ficha|calendario/i,
      );
    }
  });

  test("cada sector dice para quién es, con el nombre de su gremio", () => {
    // Lo primero que tiene que leer un psicólogo es que esto está hecho para
    // psicólogos. Un rótulo genérico lo deja en «otra agencia más».
    for (const s of SECTORES_GROWTH) {
      expect(s.eyebrow).toMatch(/^Especialistas en captar /);
      expect(s.eyebrow).toContain(s.termino.plural);
      expect(s.metaTitulo).toContain(s.termino.plural);
    }
  });
});
