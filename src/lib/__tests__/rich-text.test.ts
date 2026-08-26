import { describe, expect, test } from "vitest";
import {
  sanitizeRichText,
  richTextToPlain,
  isRichTextEmpty,
  plainToRichText,
} from "../rich-text";

describe("sanitizeRichText — lo que sí pasa", () => {
  test("conserva negrita, cursiva y subrayado", () => {
    expect(sanitizeRichText("<b>hola</b>")).toBe("<b>hola</b>");
    expect(sanitizeRichText("<i>hola</i>")).toBe("<i>hola</i>");
    expect(sanitizeRichText("<u>hola</u>")).toBe("<u>hola</u>");
  });

  test("normaliza las etiquetas que genera el navegador a las que entiende el email", () => {
    expect(sanitizeRichText("<strong>hola</strong>")).toBe("<b>hola</b>");
    expect(sanitizeRichText("<em>hola</em>")).toBe("<i>hola</i>");
    expect(sanitizeRichText("<STRONG>hola</STRONG>")).toBe("<b>hola</b>");
  });

  test("conserva el color de un span y lo normaliza a hex", () => {
    expect(sanitizeRichText('<span style="color:#ff0000">rojo</span>')).toBe(
      '<span style="color:#ff0000">rojo</span>',
    );
    expect(sanitizeRichText('<span style="color: #FF0000;">rojo</span>')).toBe(
      '<span style="color:#FF0000">rojo</span>',
    );
    expect(sanitizeRichText('<span style="color:rgb(255, 0, 0)">rojo</span>')).toBe(
      '<span style="color:#ff0000">rojo</span>',
    );
  });

  test("<font color> del execCommand antiguo se convierte en span con color", () => {
    expect(sanitizeRichText('<font color="#00ff00">verde</font>')).toBe(
      '<span style="color:#00ff00">verde</span>',
    );
  });

  test("conserva enlaces http, https, mailto y tel", () => {
    for (const url of [
      "https://www.dinkbit.es",
      "http://www.dinkbit.es",
      "mailto:hola@dinkbit.es",
      "tel:+34657559397",
    ]) {
      expect(sanitizeRichText(`<a href="${url}">x</a>`)).toContain(`href="${url}"`);
    }
  });

  test("los enlaces salen con target y rel seguros", () => {
    const out = sanitizeRichText('<a href="https://x.com">x</a>');
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener noreferrer"');
  });

  test("conserva saltos de línea", () => {
    expect(sanitizeRichText("uno<br>dos")).toBe("uno<br />dos");
    expect(sanitizeRichText("uno<br/>dos")).toBe("uno<br />dos");
  });

  test("anida formatos sin romperlos", () => {
    expect(sanitizeRichText('<b>muy <span style="color:#ff0000">rojo</span></b>')).toBe(
      '<b>muy <span style="color:#ff0000">rojo</span></b>',
    );
  });
});

describe("sanitizeRichText — lo que NO pasa", () => {
  test("elimina scripts y su contenido", () => {
    expect(sanitizeRichText('<script>alert(1)</script>hola')).toBe("hola");
    expect(sanitizeRichText('<SCRIPT>alert(1)</SCRIPT>')).toBe("");
    expect(sanitizeRichText('<script src="https://evil.com/x.js"></script>')).toBe("");
  });

  test("elimina style, iframe, object y su contenido", () => {
    expect(sanitizeRichText("<style>body{display:none}</style>texto")).toBe("texto");
    expect(sanitizeRichText('<iframe src="https://evil.com"></iframe>')).toBe("");
    expect(sanitizeRichText("<object data=x></object>")).toBe("");
  });

  test("quita etiquetas no permitidas pero conserva su texto", () => {
    expect(sanitizeRichText("<div>hola</div>")).toBe("hola");
    expect(sanitizeRichText("<h1>hola</h1>")).toBe("hola");
    expect(sanitizeRichText('<img src="x" onerror="alert(1)">hola')).toBe("hola");
  });

  test("elimina manejadores de evento aunque la etiqueta esté permitida", () => {
    const out = sanitizeRichText('<b onclick="alert(1)" onmouseover="x()">hola</b>');
    expect(out).toBe("<b>hola</b>");
    expect(out).not.toContain("onclick");
  });

  test("bloquea javascript:, data: y vbscript: en los enlaces", () => {
    for (const bad of [
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      "  javascript:alert(1)",
      "java\tscript:alert(1)",
      "data:text/html;base64,PHNjcmlwdD4=",
      "vbscript:msgbox",
    ]) {
      const out = sanitizeRichText(`<a href="${bad}">pincha</a>`);
      expect(out.toLowerCase()).not.toContain("javascript");
      expect(out.toLowerCase()).not.toContain("vbscript");
      expect(out.toLowerCase()).not.toContain("data:text/html");
      expect(out).toContain("pincha");
    }
  });

  test("no deja pasar estilos que no sean color", () => {
    const out = sanitizeRichText(
      '<span style="color:#ff0000;position:fixed;background:url(javascript:alert(1))">x</span>',
    );
    expect(out).toBe('<span style="color:#ff0000">x</span>');
  });

  test("un span sin color válido se queda en texto pelado", () => {
    expect(sanitizeRichText('<span style="position:fixed">x</span>')).toBe("x");
    expect(sanitizeRichText('<span style="color:expression(alert(1))">x</span>')).toBe("x");
  });

  test("escapa el texto suelto y los signos que no forman etiqueta", () => {
    expect(sanitizeRichText("5 < 7 y 9 > 3")).toBe("5 &lt; 7 y 9 &gt; 3");
    expect(sanitizeRichText("Tom & Jerry")).toBe("Tom &amp; Jerry");
    expect(sanitizeRichText("ya &amp; escapado")).toBe("ya &amp; escapado");
  });

  test("cierra las etiquetas que el usuario dejó abiertas", () => {
    expect(sanitizeRichText("<b>sin cerrar")).toBe("<b>sin cerrar</b>");
    expect(sanitizeRichText("<b><i>cruzadas</b></i>")).toBe("<b><i>cruzadas</i></b>");
  });

  test("ignora cierres huérfanos", () => {
    expect(sanitizeRichText("hola</b>")).toBe("hola");
  });

  test("los comentarios HTML desaparecen", () => {
    expect(sanitizeRichText("<!-- oculto -->visible")).toBe("visible");
  });

  test("entrada vacía o solo espacios no revienta", () => {
    expect(sanitizeRichText("")).toBe("");
    expect(sanitizeRichText("   ")).toBe("   ");
  });
});

describe("richTextToPlain", () => {
  test("devuelve el texto sin etiquetas, para la versión text/plain", () => {
    expect(richTextToPlain('<b>Hola</b> <span style="color:#f00">mundo</span>')).toBe(
      "Hola mundo",
    );
  });

  test("los saltos de línea se conservan", () => {
    expect(richTextToPlain("uno<br />dos")).toBe("uno\ndos");
  });

  test("desescapa las entidades", () => {
    expect(richTextToPlain("Tom &amp; Jerry &lt;3")).toBe("Tom & Jerry <3");
  });

  test("un enlace deja el texto y la url entre paréntesis", () => {
    expect(richTextToPlain('<a href="https://x.com">pincha</a>')).toBe(
      "pincha (https://x.com)",
    );
  });
});

describe("isRichTextEmpty", () => {
  test("detecta lo que no aporta texto", () => {
    for (const v of ["", "   ", "<br />", "<b></b>", "<b> </b>", undefined, null]) {
      expect(isRichTextEmpty(v)).toBe(true);
    }
  });

  test("con contenido real, no está vacío", () => {
    expect(isRichTextEmpty("<b>x</b>")).toBe(false);
    expect(isRichTextEmpty("hola")).toBe(false);
  });
});

describe("plainToRichText", () => {
  test("escapa el texto y convierte los saltos en <br />", () => {
    expect(plainToRichText("uno\ndos")).toBe("uno<br />dos");
    expect(plainToRichText("<b>literal</b>")).toBe("&lt;b&gt;literal&lt;/b&gt;");
  });

  test("ida y vuelta: lo que entra en plano sale igual en plano", () => {
    const original = "Tom & Jerry\n5 < 7";
    expect(richTextToPlain(plainToRichText(original))).toBe(original);
  });

  test("vacío se queda vacío", () => {
    expect(plainToRichText("")).toBe("");
    expect(plainToRichText("   ")).toBe("");
    expect(plainToRichText(null)).toBe("");
  });
});

// Chrome (y Safari) generan el formato como estilos en un <span>, no como
// etiquetas. Si el saneador solo mira el color, la negrita, la cursiva y el
// subrayado desaparecen al guardar — que es exactamente lo que pasaba.
describe("formato que llega como estilo en un span", () => {
  test("font-weight se convierte en negrita", () => {
    expect(sanitizeRichText('<span style="font-weight: bold;">hola</span>')).toBe("<b>hola</b>");
    expect(sanitizeRichText('<span style="font-weight: 700;">hola</span>')).toBe("<b>hola</b>");
    expect(sanitizeRichText('<span style="font-weight: 600">hola</span>')).toBe("<b>hola</b>");
  });

  test("font-weight normal no pone negrita", () => {
    expect(sanitizeRichText('<span style="font-weight: normal;">hola</span>')).toBe("hola");
    expect(sanitizeRichText('<span style="font-weight: 400;">hola</span>')).toBe("hola");
  });

  test("font-style se convierte en cursiva", () => {
    expect(sanitizeRichText('<span style="font-style: italic;">hola</span>')).toBe("<i>hola</i>");
  });

  test("text-decoration se convierte en subrayado", () => {
    expect(sanitizeRichText('<span style="text-decoration: underline;">hola</span>')).toBe("<u>hola</u>");
    expect(sanitizeRichText('<span style="text-decoration-line: underline;">hola</span>')).toBe("<u>hola</u>");
  });

  test("color y negrita a la vez se conservan LOS DOS", () => {
    expect(
      sanitizeRichText('<span style="color: rgb(255, 0, 0); font-weight: bold;">hola</span>'),
    ).toBe('<span style="color:#ff0000"><b>hola</b></span>');
  });

  test("los tres formatos juntos sobre el mismo texto", () => {
    expect(
      sanitizeRichText(
        '<span style="font-weight: bold; font-style: italic; text-decoration: underline;">x</span>',
      ),
    ).toBe("<b><i><u>x</u></i></b>");
  });

  test("un enlace no se lleva por delante el formato del texto", () => {
    expect(
      sanitizeRichText('<a href="https://x.com"><span style="font-weight: bold;">pincha</span></a>'),
    ).toContain("<b>pincha</b>");
    expect(
      sanitizeRichText('<span style="font-weight: bold;"><a href="https://x.com">pincha</a></span>'),
    ).toContain("<b>");
  });

  test("<b> con color propio conserva ambas cosas", () => {
    expect(sanitizeRichText('<b style="color:#ff0000">x</b>')).toBe(
      '<span style="color:#ff0000"><b>x</b></span>',
    );
  });

  test("un span que solo trae estilos inútiles sigue sin dejar rastro", () => {
    expect(sanitizeRichText('<span style="line-height: 2; font-size: 40px">x</span>')).toBe("x");
  });

  test("spans anidados no descolocan el cierre", () => {
    expect(
      sanitizeRichText('<span style="color:#ff0000">rojo <span style="font-size:9px">y</span> más</span>'),
    ).toBe('<span style="color:#ff0000">rojo y más</span>');
  });
});
