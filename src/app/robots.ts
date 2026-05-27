import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /imagina-tu-web es una herramienta interactiva (genera previews con IA).
        // Ya tiene `robots: { index: false }` en su metadata, pero reforzamos
        // a nivel robots.txt para evitar crawl budget innecesario.
        disallow: ["/imagina-tu-web", "/api/"],
      },
    ],
    sitemap: "https://www.dinkbit.es/sitemap.xml",
  };
}
