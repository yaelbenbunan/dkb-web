import { describe, expect, test } from "vitest";
import { datosDeProspecto, renderPlantilla, textoAHtml } from "../plantilla";

const datos = { empresa: "Bar Pepe", ciudad: "Madrid", sector: "Restaurante", web: "barpepe.es" };

describe("renderPlantilla", () => {
  test.each(["Hola {{nombre empresa}}", "Hola {{empresa}", "Hola empresa}}"])(
    "una variable mal escrita (%s) no sale",
    (texto) => {
      const r = renderPlantilla(texto, datos);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.faltan).toContain("variable mal escrita");
    },
  );

  test("un nombre de empresa con dobles llaves se bloquea, del lado seguro", () => {
    const r = renderPlantilla("Hola {{empresa}}", { ...datos, empresa: "Bar {{X}}" });
    expect(r).toEqual({ ok: false, faltan: ["variable mal escrita"] });
  });

  test("sustituye las variables, con o sin espacios y sin distinguir mayúsculas", () => {
    expect(renderPlantilla("Hola {{empresa}} de {{ ciudad }} ({{SECTOR}})", datos)).toEqual({
      ok: true,
      texto: "Hola Bar Pepe de Madrid (Restaurante)",
    });
  });

  test("si falta un dato que la plantilla usa, no renderiza y dice cuál", () => {
    expect(renderPlantilla("Vi {{web}} de {{empresa}}", { ...datos, web: null })).toEqual({
      ok: false,
      faltan: ["web"],
    });
  });

  test("un dato en blanco cuenta como ausente", () => {
    expect(renderPlantilla("Hola {{ciudad}}", { ...datos, ciudad: "  " })).toEqual({
      ok: false,
      faltan: ["ciudad"],
    });
  });

  test("una variable mal escrita bloquea en vez de salir tal cual", () => {
    expect(renderPlantilla("Hola {{emprsa}}", datos)).toEqual({ ok: false, faltan: ["emprsa"] });
  });

  test("no repite una variable que falta dos veces", () => {
    expect(renderPlantilla("{{web}} y {{web}}", { ...datos, web: null })).toEqual({
      ok: false,
      faltan: ["web"],
    });
  });

  test("un texto sin variables pasa sin cambios", () => {
    expect(renderPlantilla("Hola", datos)).toEqual({ ok: true, texto: "Hola" });
  });
});

describe("textoAHtml", () => {
  test("escapa el HTML de los datos", () => {
    const r = renderPlantilla("Hola {{empresa}}", { ...datos, empresa: "Bar <b>Pepe</b> & Hijos" });
    expect(r.ok && textoAHtml(r.texto)).toBe("Hola Bar &lt;b&gt;Pepe&lt;/b&gt; &amp; Hijos");
  });

  test("respeta los saltos de línea", () => {
    expect(textoAHtml("uno\ndos\n\ntres")).toBe("uno<br>dos<br><br>tres");
  });

  test("convierte las URLs en enlaces sin tragarse la puntuación final", () => {
    expect(textoAHtml("Mira https://dinkbit.es/web?a=1&b=2.")).toBe(
      'Mira <a href="https://dinkbit.es/web?a=1&amp;b=2">https://dinkbit.es/web?a=1&amp;b=2</a>.',
    );
  });

  test("una URL entre comillas no rompe su enlace", () => {
    expect(textoAHtml('Mira "https://dinkbit.es/web" hoy')).toBe(
      'Mira &quot;<a href="https://dinkbit.es/web">https://dinkbit.es/web</a>&quot; hoy',
    );
  });

  test("una URL entre ángulos no rompe su enlace", () => {
    expect(textoAHtml("Web: <https://dinkbit.es>")).toBe(
      'Web: &lt;<a href="https://dinkbit.es">https://dinkbit.es</a>&gt;',
    );
  });
});

describe("datosDeProspecto", () => {
  test("deja la web en su forma corta", () => {
    expect(
      datosDeProspecto({ name: "Bar Pepe", city: "Madrid", sector: null, website: "https://www.barpepe.es/" }),
    ).toEqual({ empresa: "Bar Pepe", ciudad: "Madrid", sector: null, web: "barpepe.es" });
  });
});
