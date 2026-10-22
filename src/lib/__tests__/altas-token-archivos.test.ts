import { describe, expect, test } from "vitest";
import { esFormatoTokenAlta, generarTokenAlta } from "@/lib/altas/token";
import {
  CAMPOS_ARCHIVO,
  MAX_BYTES_ARCHIVO,
  construirRuta,
  rutaEsDelCampo,
  sanearNombreArchivo,
  validarArchivo,
} from "@/lib/altas/archivos";

describe("token del alta", () => {
  test("son 32 bytes en base64url: 43 caracteres sin relleno", () => {
    const t = generarTokenAlta();
    expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(esFormatoTokenAlta(t)).toBe(true);
  });

  test("no se repiten", () => {
    const vistos = new Set(Array.from({ length: 200 }, generarTokenAlta));
    expect(vistos.size).toBe(200);
  });

  test("rechaza formatos que no son un token", () => {
    for (const malo of ["", "abc", "a".repeat(42), "a".repeat(44), `${"a".repeat(42)}=`, `${"a".repeat(42)}/`, null, undefined, 42]) {
      expect(esFormatoTokenAlta(malo)).toBe(false);
    }
  });
});

describe("validación de archivos por campo", () => {
  test("el logo admite svg, ai, eps, pdf y png, sin distinguir mayúsculas", () => {
    for (const nombre of ["logo.svg", "logo.AI", "logo.eps", "logo.pdf", "logo-transparente.PNG"]) {
      expect(validarArchivo("logo", nombre, 1000, "").ok).toBe(true);
    }
    expect(validarArchivo("logo", "logo.jpg", 1000, "image/jpeg")).toEqual({ ok: false, error: expect.stringMatching(/logo/i) });
  });

  test("el manual solo admite pdf", () => {
    expect(validarArchivo("manual", "manual.pdf", 1000, "application/pdf").ok).toBe(true);
    expect(validarArchivo("manual", "manual.docx", 1000, "").ok).toBe(false);
  });

  test("fotos y vídeos admiten jpg, png, webp, heic, mp4 y mov", () => {
    for (const nombre of ["a.jpg", "a.jpeg", "a.png", "a.webp", "a.heic", "a.mp4", "a.MOV"]) {
      expect(validarArchivo("fotos", nombre, 1000, "").ok).toBe(true);
    }
    expect(validarArchivo("fotos", "a.exe", 1000, "").ok).toBe(false);
    expect(validarArchivo("fotos", "a.html", 1000, "text/html").ok).toBe(false);
  });

  test("un tipo declarado que no casa con la extensión se rechaza", () => {
    expect(validarArchivo("logo", "logo.png", 1000, "text/html").ok).toBe(false);
    expect(validarArchivo("fotos", "foto.jpg", 1000, "application/x-msdownload").ok).toBe(false);
    // Sin tipo o genérico: el navegador no siempre lo sabe (.ai, .eps, .heic).
    expect(validarArchivo("logo", "logo.ai", 1000, "application/octet-stream").ok).toBe(true);
  });

  test("tamaño: vacío o por encima de 50 MB, fuera", () => {
    expect(MAX_BYTES_ARCHIVO).toBe(50 * 1024 * 1024);
    expect(validarArchivo("fotos", "a.mp4", MAX_BYTES_ARCHIVO, "video/mp4").ok).toBe(true);
    expect(validarArchivo("fotos", "a.mp4", MAX_BYTES_ARCHIVO + 1, "video/mp4")).toEqual({ ok: false, error: expect.stringMatching(/50 MB/) });
    expect(validarArchivo("fotos", "a.mp4", 0, "video/mp4").ok).toBe(false);
    expect(validarArchivo("fotos", "a.mp4", Number.NaN, "video/mp4").ok).toBe(false);
  });

  test("un campo que no existe se rechaza", () => {
    expect(validarArchivo("otro", "a.pdf", 10, "").ok).toBe(false);
    expect(validarArchivo("__proto__", "a.pdf", 10, "").ok).toBe(false);
  });

  test("cada campo de archivo dice su sección", () => {
    expect(CAMPOS_ARCHIVO.logo.seccion).toBe("diseno");
    expect(CAMPOS_ARCHIVO.manual.seccion).toBe("diseno");
    expect(CAMPOS_ARCHIVO.fotos.seccion).toBe("diseno");
  });
});

describe("nombres y rutas", () => {
  test("sanea el nombre: sin rutas, sin acentos raros, sin espacios ni caracteres peligrosos", () => {
    expect(sanearNombreArchivo("../../etc/passwd.png")).toBe("passwd.png");
    expect(sanearNombreArchivo("C:\\Users\\Ana\\Logo Final (v2).PNG")).toBe("logo-final-v2.png");
    expect(sanearNombreArchivo("Diseño Ñandú ÁÉ.pdf")).toBe("diseno-nandu-ae.pdf");
    expect(sanearNombreArchivo("<script>.svg")).toBe("script.svg");
    expect(sanearNombreArchivo(".pdf")).toBe("archivo.pdf");
    expect(sanearNombreArchivo("")).toBe("archivo");
  });

  test("recorta nombres larguísimos conservando la extensión", () => {
    const n = sanearNombreArchivo(`${"a".repeat(300)}.pdf`);
    expect(n.length).toBeLessThanOrEqual(100);
    expect(n.endsWith(".pdf")).toBe(true);
  });

  test("la ruta es <alta>/<sección>/<uuid>-<nombre>", () => {
    const ruta = construirRuta("11111111-2222-4333-8444-555555555555", "logo", "Mi Logo.svg", "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee");
    expect(ruta).toBe("11111111-2222-4333-8444-555555555555/diseno/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee-mi-logo.svg");
  });

  test("rutaEsDelCampo: solo rutas de ese alta y ese campo, con el formato exacto", () => {
    const alta = "11111111-2222-4333-8444-555555555555";
    const ruta = construirRuta(alta, "fotos", "foto.jpg", "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee");
    expect(rutaEsDelCampo(ruta, alta, "fotos")).toBe(true);
    // Mismo alta y sección, pero un .jpg no vale como logo.
    expect(rutaEsDelCampo(ruta, alta, "logo")).toBe(false);
    expect(rutaEsDelCampo(ruta, "99999999-2222-4333-8444-555555555555", "fotos")).toBe(false);
    expect(rutaEsDelCampo(`${alta}/diseno/../../otra/x.jpg`, alta, "fotos")).toBe(false);
    expect(rutaEsDelCampo(`${alta}/diseno/sin-uuid.jpg`, alta, "fotos")).toBe(false);
    expect(rutaEsDelCampo(`${alta}/diseno/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee-x.exe`, alta, "fotos")).toBe(false);
  });
});
