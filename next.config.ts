import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const withMDX = createMDX({});

const config: NextConfig = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  experimental: {
    // The preview-follow-up action receives a captured JPEG of the rendered
    // preview (~1-3 MB). Raise the default 1 MB server-action body cap.
    serverActions: { bodySizeLimit: "8mb" },
  },
  images: {
    // AVIF first, WebP fallback. Next ya negocia con el Accept del cliente.
    formats: ["image/avif", "image/webp"],
    deviceSizes: [375, 640, 750, 828, 1080, 1200, 1440, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365,
    // Allow next/image to render local SVGs (partner logos).
    // CSP below restricts inline scripts/styles inside SVG to prevent XSS.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  redirects: async () => [
    // La landing del sistema para clínicas se llamó Escala, en /escala, del 26
    // de agosto al 25 de septiembre de 2026, y vuelve a llamarse Growth, en
    // /growth. 301 y no 302: /escala estuvo en el sitemap, en anuncios y en las
    // secuencias comerciales, y esos enlaces van a seguir vivos años.
    //
    // Esta redirección NO se quita nunca, aunque parezca que ya no la usa
    // nadie: lo que se rompe al quitarla no se ve desde aquí. La de /growth →
    // /escala que había antes se quitó a la vez, porque con las dos puestas la
    // ruta entraría en bucle.
    {
      source: "/escala",
      destination: "/growth",
      permanent: true,
    },
    {
      source: "/escala/:slug*",
      destination: "/growth/:slug*",
      permanent: true,
    },
    // El servicio de IA y automatización se sustituye por el de anuncios en
    // ChatGPT y visibilidad en buscadores con IA. La URL vieja estaba indexada
    // y enlazada desde el menú de servicios, así que 301 y no se quita.
    {
      source: "/servicios/inteligencia-artificial",
      destination: "/servicios/anuncios-chatgpt",
      permanent: true,
    },
    // Renombrado del slug por consistencia en plural.
    {
      source: "/casos-de-exito/reforma-servilucas",
      destination: "/casos-de-exito/reformas-servilucas",
      permanent: true,
    },
    // La landing de ordenadores con el bono pasa a llamarse Puesto Seguro.
    // 301 (permanent) para que Google traspase el posicionamiento de la URL
    // vieja, que llevaba tiempo indexada, en vez de tratarla como una página
    // nueva sin historial. Ojo: NO puede afectar a /kit-digital-2026, que es
    // otra landing distinta — de ahí que las fuentes sean la ruta exacta y
    // sus hijas, y no un comodín /kit-digital(.*).
    {
      source: "/kit-digital",
      destination: "/puesto-seguro",
      permanent: true,
    },
    {
      source: "/kit-digital/:slug",
      destination: "/puesto-seguro/:slug",
      permanent: true,
    },
  ],
};

export default withMDX(config);
