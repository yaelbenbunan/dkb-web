import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { TagPill } from "./TagPill";
import type { BlogPost } from "@/lib/types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function PostHero({ post }: { post: BlogPost }) {
  const hasImage = post.coverStyle === "image" && post.cover;

  return (
    <header className="relative isolate overflow-hidden">
      {hasImage ? (
        <>
          <Image
            src={post.cover!}
            alt=""
            fill
            priority
            sizes="100vw"
            className="-z-30 object-cover object-center opacity-50"
          />
          <div
            aria-hidden
            className="absolute inset-0 -z-20"
            style={{
              background:
                "linear-gradient(180deg, rgba(8,17,42,0.55) 0%, rgba(8,17,42,0.95) 100%)",
            }}
          />
        </>
      ) : (
        <>
          <div
            aria-hidden
            className="absolute inset-0 -z-30"
            style={{
              background:
                "radial-gradient(ellipse 60% 60% at 20% 30%, rgba(58,144,242,0.55), transparent 60%), linear-gradient(135deg, #0c1c40 0%, #08112a 100%)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-20 bg-grid opacity-30 fade-edges-y"
          />
        </>
      )}

      <Container className="relative py-20 md:py-28">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            {post.tags.map((t) => (
              <TagPill key={t} tag={t} href={`/blog?tag=${t}`} size="sm" />
            ))}
          </div>
          <h1
            className="mt-6 font-black leading-[1.05] tracking-tight text-white"
            style={{ fontSize: "var(--text-display-lg)" }}
          >
            {post.title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#cfdcf2] md:text-xl">
            {post.excerpt}
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#a2b3d2]">
            <span className="flex items-center gap-3">
              {post.author.avatar ? (
                <Image
                  src={post.author.avatar}
                  alt={post.author.name}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full object-cover ring-2 ring-white/20"
                />
              ) : (
                <span
                  aria-hidden
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-bold text-white ring-2 ring-white/20"
                >
                  {post.author.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              <span>
                <span className="font-semibold text-white">
                  {post.author.name}
                </span>
                {post.author.role && (
                  <span className="ml-1 text-[#a2b3d2]">
                    · {post.author.role}
                  </span>
                )}
              </span>
            </span>
            <span aria-hidden>·</span>
            <time dateTime={post.publishedAt}>
              {formatDate(post.publishedAt)}
            </time>
            <span aria-hidden>·</span>
            <span>{post.readingMinutes} min de lectura</span>
          </div>
        </div>
      </Container>

      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent"
      />
    </header>
  );
}
