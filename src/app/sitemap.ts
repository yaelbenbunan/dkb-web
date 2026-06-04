import type { MetadataRoute } from "next";
import {
  getAllServices,
  getAllCaseStudies,
  getAllPosts,
} from "@/lib/content";
import { ALL_DEVICES } from "@/lib/kit-digital-data";

const SITE = "https://www.dinkbit.es";

type Freq = "daily" | "weekly" | "monthly" | "yearly";

interface StaticRoute {
  path: string;
  priority: number;
  changeFrequency: Freq;
}

const STATIC_ROUTES: StaticRoute[] = [
  { path: "", priority: 1.0, changeFrequency: "weekly" },
  { path: "/servicios", priority: 0.9, changeFrequency: "weekly" },
  { path: "/kit-digital", priority: 0.9, changeFrequency: "weekly" },
  { path: "/casos-de-exito", priority: 0.9, changeFrequency: "weekly" },
  { path: "/blog", priority: 0.9, changeFrequency: "weekly" },
  { path: "/nosotros", priority: 0.8, changeFrequency: "monthly" },
  { path: "/nosotros/mexico", priority: 0.7, changeFrequency: "monthly" },
  { path: "/contacto", priority: 0.8, changeFrequency: "monthly" },
  { path: "/privacidad", priority: 0.3, changeFrequency: "yearly" },
  { path: "/cookies", priority: 0.3, changeFrequency: "yearly" },
  { path: "/aviso-legal", priority: 0.3, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes = STATIC_ROUTES.map(({ path, priority, changeFrequency }) => ({
    url: `${SITE}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
  const services = getAllServices().map((s) => ({
    url: `${SITE}/servicios/${s.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as Freq,
    priority: 0.8,
  }));
  const cases = getAllCaseStudies().map((c) => ({
    url: `${SITE}/casos-de-exito/${c.slug}`,
    lastModified: new Date(c.publishedAt),
    changeFrequency: "monthly" as Freq,
    priority: 0.7,
  }));
  const posts = getAllPosts().map((p) => ({
    url: `${SITE}/blog/${p.slug}`,
    lastModified: new Date(p.publishedAt),
    changeFrequency: "monthly" as Freq,
    priority: 0.7,
  }));
  const kitDevices = ALL_DEVICES.map((d) => ({
    url: `${SITE}/kit-digital/${d.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as Freq,
    priority: 0.6,
  }));
  return [...staticRoutes, ...services, ...cases, ...posts, ...kitDevices];
}
