import { describe, expect, it } from "vitest";
import {
  FASES,
  FASE_COLORES,
  FASE_LABELS,
  RESULTADOS_LLAMADA,
  RESULTADO_LABELS,
  TIPOS_NEGOCIO,
  TIPO_NEGOCIO_LABELS,
  esFaseActiva,
  faseTrasLlamada,
  seguimientoTrasLlamada,
  parseTipoNegocio,
  tiposNegocioDeMarca,
} from "../ventas/dominio";

describe("tiposNegocioDeMarca", () => {
  it("ofrece a dinkbit solo tipos de clínica", () => {
    expect(tiposNegocioDeMarca("dinkbit")).toEqual(["clinica_dental", "psicologia", "estetica", "fisioterapia", "otro"]);
  });

  it("ofrece a hydrup los centros de su formulario primero, y ninguno de clínica", () => {
    const tipos = tiposNegocioDeMarca("hydrup");
    // Las cuatro opciones del formulario «B2B - genérico» de Meta, en su orden.
    expect(tipos.slice(0, 4)).toEqual(["gimnasio", "box_crossfit", "club_deportivo", "estudio"]);
    expect(tipos.at(-1)).toBe("otro");
    expect(tipos).not.toContain("clinica_dental");
    expect(tipos).not.toContain("psicologia");
  });

  it("ofrece el catálogo entero a una marca que no tiene lista propia", () => {
    expect(tiposNegocioDeMarca("una-marca-nueva")).toEqual(TIPOS_NEGOCIO);
  });

  it("si el lead ya tiene un tipo que su marca no ofrece, se sigue ofreciendo para no perderlo al guardar", () => {
    expect(tiposNegocioDeMarca("dinkbit", "gimnasio")).toContain("gimnasio");
    expect(tiposNegocioDeMarca("dinkbit", "clinica_dental")).toEqual(tiposNegocioDeMarca("dinkbit"));
    expect(tiposNegocioDeMarca("dinkbit", null)).toEqual(tiposNegocioDeMarca("dinkbit"));
  });

  it("solo devuelve tipos del catálogo, para que la validación los acepte", () => {
    for (const slug of ["dinkbit", "hydrup"]) {
      for (const tipo of tiposNegocioDeMarca(slug)) {
        expect(TIPOS_NEGOCIO).toContain(tipo);
      }
    }
  });

  it("todo tipo del catálogo tiene etiqueta", () => {
    for (const tipo of TIPOS_NEGOCIO) {
      expect(TIPO_NEGOCIO_LABELS[tipo]).toBeTruthy();
    }
  });
});

describe("parseTipoNegocio", () => {
  it("entiende las respuestas del formulario de Hydrup tal como las manda Meta", () => {
    expect(parseTipoNegocio("gimnasio/centro_fitness")).toBe("gimnasio");
    expect(parseTipoNegocio("box_de_crossfit_/entrenamiento_funcional")).toBe("box_crossfit");
    expect(parseTipoNegocio("club_de_pádel/tenis/_raqueta")).toBe("club_deportivo");
    expect(parseTipoNegocio("estudio_(yoga,_pilates,_boxeo,_etc.)")).toBe("estudio");
    expect(parseTipoNegocio("otro")).toBe("otro");
  });

  it("y las mismas escritas como se leen en el formulario", () => {
    expect(parseTipoNegocio("Gimnasio/centro fitness")).toBe("gimnasio");
    expect(parseTipoNegocio("Box de CrossFit /entrenamiento funcional")).toBe("box_crossfit");
    expect(parseTipoNegocio("Club de pádel/tenis/ raqueta")).toBe("club_deportivo");
    expect(parseTipoNegocio("Estudio (yoga, pilates, boxeo, etc.)")).toBe("estudio");
  });

  it("entiende los tipos de clínica escritos de varias formas", () => {
    expect(parseTipoNegocio("clinica_dental")).toBe("clinica_dental");
    expect(parseTipoNegocio("Clínica dental")).toBe("clinica_dental");
    expect(parseTipoNegocio("dentista")).toBe("clinica_dental");
    expect(parseTipoNegocio("Psicólogo")).toBe("psicologia");
    expect(parseTipoNegocio("consulta de psicología")).toBe("psicologia");
  });

  it("lo que no reconoce se queda sin tipo, no en uno inventado", () => {
    expect(parseTipoNegocio("")).toBeNull();
    expect(parseTipoNegocio("panadería")).toBeNull();
  });
});

describe("fases nuevas", () => {
  it("«Volver a llamar» es fase activa: conserva el seguimiento", () => {
    expect(FASES).toContain("volver_a_llamar");
    expect(esFaseActiva("volver_a_llamar")).toBe(true);
  });

  it("«Fuera de perfil» no es activa: el lead ya no se trabaja", () => {
    expect(FASES).toContain("fuera_de_perfil");
    expect(esFaseActiva("fuera_de_perfil")).toBe(false);
  });

  it("registrar «volver a llamar» lleva el lead a esa fase, venga de donde venga", () => {
    // Es un estado lateral, no un paso del embudo: por eso gana también sobre
    // fases más avanzadas. Sacarlo de ahí es decisión manual de la comercial.
    expect(faseTrasLlamada("nuevo", "volver_a_llamar")).toBe("volver_a_llamar");
    expect(faseTrasLlamada("contactado", "volver_a_llamar")).toBe("volver_a_llamar");
    expect(faseTrasLlamada("interesado", "volver_a_llamar")).toBe("volver_a_llamar");
  });

  it("no toca a un cliente, como el resto de resultados", () => {
    expect(faseTrasLlamada("cliente", "volver_a_llamar")).toBe("cliente");
  });

  it("las dos fases nuevas tienen etiqueta y color", () => {
    for (const fase of ["volver_a_llamar", "fuera_de_perfil"] as const) {
      expect(FASE_LABELS[fase]).toBeTruthy();
      expect(FASE_COLORES[fase]).toBeTruthy();
    }
  });
});

describe("descartar por «no busca lo que ofrecemos» desde la llamada", () => {
  // La fase `fuera_de_perfil` existía desde el 24-09 pero no se podía poner más
  // que entrando en la ficha del lead y usando el desplegable de fases. El
  // momento en que de verdad se descubre es AL TELÉFONO —se le localiza, se le
  // explica, y resulta que no busca esto—, así que tiene que ser un resultado
  // de llamada como los demás.
  it("es un resultado de llamada ofrecido en el formulario", () => {
    expect(RESULTADOS_LLAMADA).toContain("fuera_de_perfil");
    expect(RESULTADO_LABELS.fuera_de_perfil).toBeTruthy();
  });

  it("manda el lead a «Fuera de perfil», venga de donde venga", () => {
    expect(faseTrasLlamada("nuevo", "fuera_de_perfil")).toBe("fuera_de_perfil");
    expect(faseTrasLlamada("contactado", "fuera_de_perfil")).toBe("fuera_de_perfil");
    expect(faseTrasLlamada("muestras", "fuera_de_perfil")).toBe("fuera_de_perfil");
  });

  it("no descarta a un cliente por una llamada", () => {
    // Misma protección que el resto de resultados: quien ya compró no sale del
    // embudo por marcar mal un desplegable.
    expect(faseTrasLlamada("cliente", "fuera_de_perfil")).toBe("cliente");
  });

  it("cierra el seguimiento pendiente, como «no le interesa»", () => {
    // Un lead descartado no puede seguir apareciendo en la lista de llamadas
    // del día: es justo lo que se quería quitar de en medio.
    expect(seguimientoTrasLlamada("fuera_de_perfil", "2026-10-05")).toBeNull();
  });
});
