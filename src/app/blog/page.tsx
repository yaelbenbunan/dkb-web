import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { BlogFilters } from "@/components/blog/BlogFilters";
import { getAllPosts, getAllBlogTags } from "@/lib/content";

export const metadata: Metadata = {
  title: "Blog — ideas y estrategia digital",
  description:
    "Artículos sobre desarrollo web, ecommerce, paid media, SEO y la cultura dinkbit. Pensados para marcas que quieren entender antes de invertir.",
  alternates: { canonical: "/blog" },
  openGraph: {
    type: "website",
    url: "/blog",
    title: "Blog dinkbit — ideas y estrategia digital",
    description:
      "Artículos sobre estrategia digital, desarrollo web y marketing por el equipo de dinkbit en Madrid.",
  },
};

export default async function BlogIndex({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag } = await searchParams;
  const posts = getAllPosts();
  const tags = getAllBlogTags();

  return (
    <>
      {/* Hero editorial — compacto */}
      <section className="relative isolate overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-40 fade-edges-y"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-20 spotlight-accent"
          style={{ ["--sx" as string]: "85%", ["--sy" as string]: "10%" }}
        />
        <Container className="relative py-10 md:py-14">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-accent">
            Blog dinkbit
          </p>
          <h1
            className="mt-4 font-black leading-[0.95] tracking-tight"
            style={{ fontSize: "var(--text-display-lg)" }}
          >
            Ideas sin <span className="italic text-accent">postureo</span>.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-fg-muted md:text-lg">
            Lo que pensamos sobre desarrollo web, ecommerce, paid media,
            estrategia y la cultura que hay detrás de cada proyecto.
          </p>
        </Container>
      </section>

      <Container className="pb-16 md:pb-20">
        <BlogFilters posts={posts} allTags={tags} initialTag={tag ?? null} />
      </Container>
    </>
  );
}
