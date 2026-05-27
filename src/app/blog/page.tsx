import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { BlogCard } from "@/components/blog/BlogCard";
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
      "Artículos sobre estrategia digital, desarrollo web y marketing por el equipo de dinkbit en Madrid y México.",
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
  const featured = posts.filter((p) => p.featured).slice(0, 2);
  const rest = posts.filter((p) => !featured.find((f) => f.slug === p.slug));

  return (
    <>
      {/* Hero editorial */}
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
        <Container className="relative py-20 md:py-28">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-accent">
            Blog dinkbit
          </p>
          <h1
            className="mt-6 font-black leading-[0.95] tracking-tight"
            style={{ fontSize: "var(--text-display-xl)" }}
          >
            Ideas sin{" "}
            <span className="italic text-accent">postureo</span>.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-fg-muted md:text-xl">
            Lo que pensamos sobre desarrollo web, ecommerce, paid media,
            estrategia y la cultura que hay detrás de cada proyecto.
          </p>
        </Container>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <Container className="py-12 md:py-16">
          <div
            className={
              featured.length === 1
                ? "grid gap-6"
                : "grid gap-6 lg:grid-cols-2"
            }
          >
            {featured.map((post) => (
              <BlogCard
                key={post.slug}
                post={post}
                variant={featured.length === 1 ? "feature" : "lg"}
              />
            ))}
          </div>
        </Container>
      )}

      {/* Filtros + grid */}
      <Container className="py-8 md:py-12">
        <BlogFilters
          posts={rest}
          allTags={tags}
          initialTag={tag ?? null}
        />
      </Container>
    </>
  );
}
