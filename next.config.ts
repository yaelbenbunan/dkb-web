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
    // La landing del sistema para clínicas deja de llamarse "growth" y pasa a
    // llamarse Escala. 301 y no 302: la ruta vieja estaba en el sitemap y hay
    // enlaces sueltos por ahí —correos, mensajes— que van a seguir vivos años.
    //
    // Esta redirección NO se quita nunca, aunque parezca que ya no la usa
    // nadie: lo que se rompe al quitarla no se ve desde aquí.
    {
      source: "/growth",
      destination: "/escala",
      permanent: true,
    },
    {
      source: "/growth/:slug*",
      destination: "/escala/:slug*",
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
