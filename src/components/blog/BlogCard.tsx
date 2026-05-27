import Link from "next/link";
import Image from "next/image";
import { TagPill } from "./TagPill";
import type { BlogPost } from "@/lib/types";

interface BlogCardProps {
  post: BlogPost;
  /** Variantes de tamaño: feature = hero grande, lg = doble columna, md = estándar */
  variant?: "feature" | "lg" | "md";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const COVER_GRADIENTS = [
  "radial-gradient(ellipse 80% 60% at 30% 30%, rgba(58,144,242,0.55), transparent 65%), linear-gradient(135deg, #0c1c40 0%, #08112a 100%)",
  "radial-gradient(ellipse 70% 60% at 70% 30%, rgba(124,93,250,0.45), transparent 60%), linear-gradient(135deg, #0c1840 0%, #07091f 100%)",
  "radial-gradient(ellipse 60% 70% at 40% 70%, rgba(24,123,239,0.5), transparent 65%), linear-gradient(135deg, #06203f 0%, #0a0b1f 100%)",
];

function gradientFor(slug: string): string {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return COVER_GRADIENTS[h % COVER_GRADIENTS.length];
}

export function BlogCard({ post, variant = "md" }: BlogCardProps) {
  const hasImage = post.coverStyle === "image" && post.cover;
  const isFeature = variant === "feature";
  const isLarge = variant === "lg";

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group surface surface-hover relative flex h-full flex-col overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_25px_50px_-15px_rgba(24,123,239,0.45)]"
    >
      {/* Cover */}
      <div
        className={
          isFeature
            ? "relative aspect-[16/9] w-full overflow-hidden md:aspect-[16/8]"
            : isLarge
              ? "relative aspect-[16/9] w-full overflow-hidden"
              : "relative aspect-[4/3] w-full overflow-hidden"
        }
        style={!hasImage ? { background: gradientFor(post.slug) } : undefined}
      >
        {hasImage ? (
          <Image
            src={post.cover!}
            alt={post.title}
            fill
            sizes={
              isFeature
                ? "100vw"
                : isLarge
                  ? "(max-width: 1024px) 100vw, 66vw"
                  : "(max-width: 768px) 100vw, 33vw"
            }
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          // Gradiente con el título tipográfico encima — sin imagen
          <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-10">
            <span
              aria-hidden
              className="absolute right-6 top-6 text-[10px] font-bold uppercase tracking-[0.25em] text-white/40"
            >
              dinkbit · blog
            </span>
            <p
              className="font-black leading-[0.95] tracking-tight text-white/85"
              style={{
                fontSize: isFeature
                  ? "var(--text-display-md)"
                  : isLarge
                    ? "var(--text-display-sm)"
                    : "1.6rem",
              }}
            >
              {post.title}
            </p>
          </div>
        )}
        {/* Tag overlay */}
        {post.tags[0] && (
          <div className="absolute left-4 top-4">
            <TagPill tag={post.tags[0]} variant="solid" size="sm" />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-6 md:p-7">
        <h3
          className={
            isFeature
              ? "font-black leading-tight tracking-tight text-fg md:text-3xl"
              : isLarge
                ? "text-xl font-bold leading-tight text-fg md:text-2xl"
                : "text-lg font-bold leading-tight text-fg"
          }
          style={
            isFeature
              ? { fontSize: "var(--text-display-sm)", lineHeight: 1.1 }
              : undefined
          }
        >
          {post.title}
        </h3>
        <p
          className={
            isFeature
              ? "mt-4 text-base text-fg-muted md:text-lg"
              : "mt-3 line-clamp-3 text-sm text-fg-muted md:text-base"
          }
        >
          {post.excerpt}
        </p>
        <div className="mt-auto flex items-center gap-3 pt-5 text-xs text-fg-dim">
          <span>{formatDate(post.publishedAt)}</span>
          <span aria-hidden>·</span>
          <span>{post.readingMinutes} min de lectura</span>
        </div>
      </div>
    </Link>
  );
}
