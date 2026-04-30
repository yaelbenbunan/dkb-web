import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import type { Service, CaseStudy } from "./types";

const ROOT = join(process.cwd(), "src/content");

function readMdx(
  dir: string,
): Array<{ data: Record<string, unknown>; body: string; filename: string }> {
  const fullDir = join(ROOT, dir);
  if (!existsSync(fullDir)) return [];
  return readdirSync(fullDir)
    .filter((f) => f.endsWith(".mdx"))
    .map((filename) => {
      const raw = readFileSync(join(fullDir, filename), "utf8");
      const { data, content } = matter(raw);
      return { data, body: content, filename };
    });
}

export function getAllServices(): Service[] {
  return readMdx("servicios")
    .map(({ data, body }) => ({
      slug: String(data.slug),
      title: String(data.title),
      shortDescription: String(data.shortDescription ?? ""),
      heroImage: data.heroImage as string | undefined,
      order: Number(data.order ?? 999),
      body,
    }))
    .sort((a, b) => a.order - b.order);
}

export function getServiceBySlug(slug: string): Service | undefined {
  return getAllServices().find((s) => s.slug === slug);
}

export function getAllCaseStudies(): CaseStudy[] {
  return readMdx("casos-de-exito")
    .map(({ data, body }) => ({
      slug: String(data.slug),
      title: String(data.title),
      client: String(data.client ?? ""),
      tags: (data.tags as string[]) ?? [],
      heroImage: data.heroImage as string | undefined,
      metricHeadline: data.metricHeadline as string | undefined,
      publishedAt: String(data.publishedAt ?? new Date().toISOString()),
      body,
    }))
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

export function getCaseStudyBySlug(slug: string): CaseStudy | undefined {
  return getAllCaseStudies().find((c) => c.slug === slug);
}
