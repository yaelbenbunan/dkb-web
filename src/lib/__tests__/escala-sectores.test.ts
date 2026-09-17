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
    const c = GENERAL.comparativa;
    expect(c.tipo).toBe("beneficio");
    if (c.tipo !== "beneficio") return;
    expect(c.ticket).toBe("250 €");
    expect(c.sin.queda).toBe("2.000 €");
    expect(c.con.queda).toBe("4.000 €");
    expect(GENERAL.titular.primera).toBe("Llenar tu agenda es fácil.");
    // Y no lleva eyebrow: no tiene a quién señalar.
    expect(GENERAL.eyebrow).toBeUndefined();
  });

  test("las cuentas de la comparativa cuadran", () => {
    // **La tabla es el argumento entero de la página**, y quien la lee es dueño
    // de un negocio: lo primero que hace es multiplicar. Si «el doble de
    // beneficio» no sale el doble, o la factura no sale de sus propias filas,
    // deja de creerse la tabla — y con ella todo lo demás. Pasó: fisioterapia y
    // psicología prometían el doble con 1.500 € frente a 3.600 € y 3.400 €.
    const euros = (t: string) => Number(t.replace(/[^0-9]/g, ""));
    for (const s of [GENERAL, ...SECTORES_ESCALA]) {
      const nombre = s.slug || "general";
      const comp = s.comparativa;
      if (comp.tipo === "agenda") {
        const capacidad = Number(comp.capacidad);
        for (const f of [comp.sin, comp.con]) {
          expect(Number(f.libres), `${nombre}: huecos`).toBe(capacidad - Number(f.ocupadas));
          expect(euros(f.ocupacion), `${nombre}: ocupación`).toBe(
            Math.round((Number(f.ocupadas) / capacidad) * 100),
          );
        }
        continue;
      }
      const porPersona = euros(comp.ticket) * Number(comp.repite?.veces ?? 1);
      for (const c of [comp.sin, comp.con]) {
        expect(euros(c.factura), `${nombre}: factura`).toBe(Number(c.entran) * porPersona);
        expect(euros(c.queda), `${nombre}: beneficio`).toBe(euros(c.factura) - euros(c.gasto));
      }
      if (comp.con.remate.includes("doble")) {
        expect(euros(comp.con.queda), `${nombre}: el doble`).toBe(2 * euros(comp.sin.queda));
      }
    }
  });

  test("a psicología se le vende agenda llena, no dinero", () => {
    // Decidido el 17 de septiembre de 2026: su reto es llenar huecos, no
    // exprimir la sesión. Si alguien copia la cabecera de otra landing, esto
    // lo caza antes de publicarlo.
    const p = sectorPorSlug("psicologia")!;
    expect(p.comparativa.tipo).toBe("agenda");
    const cabecera = JSON.stringify([
      p.metaTitulo,
      p.metaDescripcion,
      p.titular,
      p.subtitulo,
      p.tituloProblema,
      p.pasos,
      p.panel,
    ]);
    expect(cabecera).not.toMatch(/ganar|beneficio|dinero|rentabilidad|factura/i);
  });

  test("cada sector dice para quién es, con el nombre de su gremio", () => {
    // Lo primero que tiene que leer un psicólogo es que esto está hecho para
    // psicólogos. Un rótulo genérico lo deja en «otra agencia más».
    for (const s of SECTORES_ESCALA) {
      expect(s.eyebrow).toMatch(/^Especialistas en captar /);
      expect(s.eyebrow).toContain(s.termino.plural);
      expect(s.metaTitulo).toContain(s.termino.plural);
    }
  });
});
