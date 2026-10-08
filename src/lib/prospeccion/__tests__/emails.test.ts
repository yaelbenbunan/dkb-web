import { describe, expect, test } from "vitest";
import { elegirEmail, enlacesDeContacto, extraerEmails } from "../emails";

describe("extraerEmails", () => {
  test("saca direcciones de mailto y del texto, sin repetir y en minúsculas", () => {
    const html = `<a href="mailto:Info@Bar.es?subject=Hola">Escríbenos</a><p>o a reservas@bar.es.</p><p>info@bar.es</p>`;
    expect(extraerEmails(html).sort()).toEqual(["info@bar.es", "reservas@bar.es"]);
  });

  test("entiende ofuscaciones sencillas", () => {
    expect(extraerEmails("<p>info [at] bar [dot] es</p>")).toEqual(["info@bar.es"]);
    expect(extraerEmails("<p>hola (arroba) bar (punto) es</p>")).toEqual(["hola@bar.es"]);
    expect(extraerEmails("<p>info&#64;bar&#46;es</p>")).toEqual(["info@bar.es"]);
  });

  test("descarta falsos positivos", () => {
    const html = `
      <img src="logo@2x.png">
      <script>var dsn = "https://abc123@o1.ingest.sentry.io/5";</script>
      <p>ejemplo@tudominio.com noreply@bar.es dpo@bar.es</p>
      <p>a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4@sentry.wixpress.com</p>`;
    expect(extraerEmails(html)).toEqual([]);
  });
});

describe("elegirEmail", () => {
  test("prefiere la genérica del propio dominio", () => {
    expect(elegirEmail(["juan.perez@bar.es", "bar@gmail.com", "info@bar.es"], "www.bar.es")).toEqual({
      email: "info@bar.es",
      tipo: "generica",
    });
  });

  test("una dirección de proveedor gratuito vale como genérica si no parece una persona", () => {
    expect(elegirEmail(["restaurantebar@gmail.com"], "bar.es")).toEqual({
      email: "restaurantebar@gmail.com",
      tipo: "generica",
    });
  });

  test("marca como personal lo que parece una persona", () => {
    expect(elegirEmail(["juan.perez@bar.es"], "bar.es")?.tipo).toBe("personal");
    expect(elegirEmail(["juan@bar.es"], "bar.es")?.tipo).toBe("personal");
    expect(elegirEmail(["maria.lopez@gmail.com"], "bar.es")?.tipo).toBe("personal");
  });

  test("«reservas.madrid@» sigue siendo genérica", () => {
    expect(elegirEmail(["reservas.madrid@bar.es"], "bar.es")?.tipo).toBe("generica");
  });

  test("nunca elige la dirección de un tercero (la agencia que hizo la web)", () => {
    expect(elegirEmail(["info@agenciaweb.com"], "bar.es")).toBeNull();
    expect(elegirEmail(["info@agenciaweb.com", "juan@bar.es"], "bar.es")?.email).toBe("juan@bar.es");
  });

  test("acepta subdominios del negocio", () => {
    expect(elegirEmail(["info@bar.es"], "reservas.bar.es")?.email).toBe("info@bar.es");
  });

  test("una web alojada en una plataforma no hace suyas las direcciones de la plataforma", () => {
    expect(elegirEmail(["info@wixsite.com"], "negocio.wixsite.com")).toBeNull();
    expect(elegirEmail(["support@myshopify.com"], "www.tienda.myshopify.com")).toBeNull();
    // La dirección del propio subdominio sí es del negocio.
    expect(elegirEmail(["info@negocio.wixsite.com"], "negocio.wixsite.com")?.email).toBe("info@negocio.wixsite.com");
  });

  test("sin candidatas devuelve null", () => {
    expect(elegirEmail([], "bar.es")).toBeNull();
  });

  test("Gmail sin nombre del negocio es personal, no genérica", () => {
    expect(elegirEmail(["juan@gmail.com"], "bar.es")?.tipo).toBe("personal");
    expect(elegirEmail(["mariagarcia@hotmail.com"], "bar.es")?.tipo).toBe("personal");
    expect(elegirEmail(["maria.lopez88@gmail.com"], "bar.es")?.tipo).toBe("personal");
  });

  test("Gmail con nombre del negocio (3+ caracteres) es genérica", () => {
    expect(elegirEmail(["barpepe.madrid@gmail.com"], "www.barpepe.es")?.tipo).toBe("generica");
    expect(elegirEmail(["info@gmail.com"], "bar.es")?.tipo).toBe("generica");
  });

  test("etiqueta de dominio muy corta (< 3 caracteres) no hace genérica", () => {
    expect(elegirEmail(["laura@gmail.com"], "la.es")?.tipo).toBe("personal");
  });

  test("una dirección personal en el dominio del negocio gana a Gmail no relacionado", () => {
    expect(elegirEmail(["disenador@gmail.com", "juan@bar.es"], "bar.es")).toEqual({
      email: "juan@bar.es",
      tipo: "personal",
    });
  });
});

describe("enlacesDeContacto", () => {
  const base = new URL("https://www.bar.es/");

  test("encuentra contacto y aviso legal del mismo sitio, como máximo dos", () => {
    const html = `
      <a href="/carta">Carta</a>
      <a href="/contacto">Contacto</a>
      <a href="https://bar.es/aviso-legal">Aviso legal</a>
      <a href="/politica-legal-2">Legal</a>
      <a href="https://otra.com/contacto">Contacto</a>
      <a href="mailto:info@bar.es">Contacto</a>`;
    expect(enlacesDeContacto(html, base)).toEqual([
      "https://www.bar.es/contacto",
      "https://bar.es/aviso-legal",
    ]);
  });

  test("reconoce el enlace por su texto aunque la ruta no lo diga", () => {
    expect(enlacesDeContacto(`<a href="/p/12"><span>Contacto</span></a>`, base)).toEqual([
      "https://www.bar.es/p/12",
    ]);
  });
});
