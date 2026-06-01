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
    // Renombrado del slug por consistencia en plural.
    {
      source: "/casos-de-exito/reforma-servilucas",
      destination: "/casos-de-exito/reformas-servilucas",
      permanent: true,
    },
  ],
};

export default withMDX(config);
