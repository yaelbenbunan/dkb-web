import type { MetadataRoute } from "next";
import { getAllServices, getAllCaseStudies } from "@/lib/content";

const SITE = "https://dinkbit.es";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "",
    "/nosotros",
    "/servicios",
    "/casos-de-exito",
    "/contacto",
  ].map((path) => ({ url: `${SITE}${path}`, lastModified: new Date() }));
  const services = getAllServices().map((s) => ({
    url: `${SITE}/servicios/${s.slug}`,
    lastModified: new Date(),
  }));
  const cases = getAllCaseStudies().map((c) => ({
    url: `${SITE}/casos-de-exito/${c.slug}`,
    lastModified: new Date(c.publishedAt),
  }));
  return [...staticRoutes, ...services, ...cases];
}
