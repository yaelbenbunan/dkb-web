import { Container } from "@/components/ui/Container";
import { BlogCard } from "./BlogCard";
import type { BlogPost } from "@/lib/types";

export function RelatedPosts({ posts }: { posts: BlogPost[] }) {
  if (!posts.length) return null;
  return (
    <section className="relative isolate overflow-hidden border-t border-border/50 py-20 md:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-grid-fine opacity-30 fade-edges-y"
      />
      <Container>
        <div className="flex items-end justify-between gap-6">
          <h2
            className="font-black leading-[1.1] tracking-tight"
            style={{ fontSize: "var(--text-display-sm)" }}
          >
            Sigue <span className="text-accent">leyendo</span>
          </h2>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.slice(0, 3).map((p) => (
            <BlogCard key={p.slug} post={p} variant="md" />
          ))}
        </div>
      </Container>
    </section>
  );
}
