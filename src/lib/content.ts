import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import type {
  Service,
  CaseStudy,
  CaseSection,
  ServiceFaq,
  CaseSocial,
  BlogPost,
  BlogAuthor,
  BlogCoverStyle,
  BlogTeamEntry,
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

/* ----------------------------- Blog ----------------------------- */

const WORDS_PER_MINUTE = 220;

function computeReadingMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

export function getAllPosts(): BlogPost[] {
  return readMdx("blog")
    .map(({ data, body }) => {
      const tags = ((data.tags as string[]) ?? []).map((t) => t.toLowerCase());
      const readingMinutes =
        (data.readingMinutes as number | undefined) ?? computeReadingMinutes(body);
      return {
        slug: String(data.slug),
        title: String(data.title),
        excerpt: String(data.excerpt ?? ""),
        publishedAt: String(data.publishedAt ?? new Date().toISOString()),
        tags,
        author: (data.author as BlogAuthor) ?? { name: "dinkbit" },
        cover: data.cover as string | undefined,
        coverStyle: (data.coverStyle as BlogCoverStyle) ?? "gradient",
        featured: Boolean(data.featured),
        readingMinutes,
        body,
        team: data.team as BlogTeamEntry[] | undefined,
      };
    })
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return getAllPosts().find((p) => p.slug === slug);
}

/** Devuelve la lista única de tags presentes en el blog. */
export function getAllBlogTags(): string[] {
  const set = new Set<string>();
  for (const p of getAllPosts()) {
    for (const t of p.tags) set.add(t);
  }
  return Array.from(set).sort();
}

/** Posts relacionados por superposición de tags. */
export function getRelatedPosts(slug: string, limit = 3): BlogPost[] {
  const all = getAllPosts();
  const current = all.find((p) => p.slug === slug);
  if (!current) return [];
  return all
    .filter((p) => p.slug !== slug && p.tags.some((t) => current.tags.includes(t)))
    .slice(0, limit);
}
