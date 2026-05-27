import Link from "next/link";
import type { BlogPost } from "@/lib/types";

interface Props {
  posts: BlogPost[];
  currentSlug: string;
}

export function PostAsideLinks({ posts, currentSlug }: Props) {
  const others = posts.filter((p) => p.slug !== currentSlug).slice(0, 4);
  if (!others.length) return null;
  return (
    <nav aria-label="Otros artículos">
      <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.25em] text-fg-dim">
        Otros artículos
      </p>
      <ul className="space-y-4">
        {others.map((p) => (
          <li key={p.slug}>
            <Link
              href={`/blog/${p.slug}`}
              className="group block"
            >
              <p className="text-sm font-bold leading-snug text-fg transition-colors group-hover:text-accent-hover">
                {p.title}
              </p>
              <p className="mt-1 text-xs text-fg-dim">
                {p.readingMinutes} min de lectura
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
