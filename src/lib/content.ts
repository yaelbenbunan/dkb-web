import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import type {
  Service,
  CaseStudy,
  CaseSection,
  ServiceFaq,
  CaseSocial,
} from "./types";

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
      titleLong: data.titleLong as string | undefined,
      heroTitle: data.heroTitle as string | undefined,
      heroSubtitle: data.heroSubtitle as string | undefined,
      shortDescription: String(data.shortDescription ?? ""),
      heroImage: data.heroImage as string | undefined,
      order: Number(data.order ?? 999),
      intro: data.intro as string | undefined,
      bullets: data.bullets as string[] | undefined,
      diferenciador: data.diferenciador as string | undefined,
      faqs: data.faqs as ServiceFaq[] | undefined,
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
      clientLogo: data.clientLogo as string | undefined,
      description: data.description as string | undefined,
      reto: data.reto as string | undefined,
      tags: (data.tags as string[]) ?? [],
      metricHeadline: data.metricHeadline as string | undefined,
      social: data.social as CaseSocial | undefined,
      clientSince: data.clientSince as string | undefined,
      publishedAt: String(data.publishedAt ?? new Date().toISOString()),
      sections: data.sections as CaseSection[] | undefined,
      body,
    }))
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

export function getCaseStudyBySlug(slug: string): CaseStudy | undefined {
  return getAllCaseStudies().find((c) => c.slug === slug);
}

/**
 * Returns up to `limit` other case studies that share at least one tag with the
 * given case. Excludes the case itself.
 */
export function getRelatedCases(slug: string, limit = 3): CaseStudy[] {
  const all = getAllCaseStudies();
  const current = all.find((c) => c.slug === slug);
  if (!current) return [];
  return all
    .filter(
      (c) =>
        c.slug !== slug && c.tags.some((t) => current.tags.includes(t)),
    )
    .slice(0, limit);
}
