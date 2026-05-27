"use client";

import { useCallback, useMemo, useState } from "react";
import { BlogCard } from "./BlogCard";
import type { BlogPost } from "@/lib/types";

interface BlogFiltersProps {
  posts: BlogPost[];
  allTags: string[];
  initialTag?: string | null;
}

export function BlogFilters({ posts, allTags, initialTag }: BlogFiltersProps) {
  const [activeTag, setActiveTag] = useState<string | null>(
    initialTag ?? null,
  );

  const filtered = useMemo(() => {
    if (!activeTag) return posts;
    return posts.filter((p) => p.tags.includes(activeTag));
  }, [posts, activeTag]);

  const toggle = useCallback(
    (tag: string) => setActiveTag((cur) => (cur === tag ? null : tag)),
    [],
  );

  return (
    <>
      {/* Filtros sticky */}
      <div className="sticky top-20 z-20 -mx-4 mb-12 border-y border-border/60 bg-[var(--bg)]/85 px-4 py-4 backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTag(null)}
            aria-pressed={activeTag === null}
            className={pillCls(activeTag === null)}
          >
            Todos
          </button>
          {allTags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggle(t)}
              aria-pressed={activeTag === t}
              className={pillCls(activeTag === t)}
            >
              {t.replace(/-/g, " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="py-20 text-center text-fg-muted">
          No hay artículos con este tag. Prueba con otro.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((post) => (
            <BlogCard key={post.slug} post={post} variant="md" />
          ))}
        </div>
      )}
    </>
  );
}

function pillCls(active: boolean): string {
  const base =
    "inline-flex h-9 items-center rounded-full px-4 text-xs font-bold uppercase tracking-[0.18em] transition-all";
  return active
    ? `${base} bg-accent text-white ring-1 ring-accent`
    : `${base} bg-white/[0.04] text-fg-muted ring-1 ring-white/[0.08] hover:bg-white/[0.08] hover:text-fg`;
}
