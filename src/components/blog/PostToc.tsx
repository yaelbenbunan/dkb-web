"use client";

import { useEffect, useState } from "react";
import type { Heading } from "@/lib/blog-markdown";

export function PostToc({ headings }: { headings: Heading[] }) {
  const [activeId, setActiveId] = useState<string | null>(
    headings[0]?.id ?? null,
  );

  useEffect(() => {
    if (!headings.length) return;
    const els = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el !== null);
    if (!els.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      {
        rootMargin: "-20% 0px -65% 0px",
        threshold: 0,
      },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headings]);

  if (!headings.length) return null;

  return (
    <nav aria-label="Tabla de contenidos" className="text-sm">
      <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.25em] text-fg-dim">
        En este artículo
      </p>
      <ol className="space-y-2 border-l border-border/60">
        {headings.map((h) => {
          const isActive = h.id === activeId;
          return (
            <li key={h.id}>
              <a
                href={`#${h.id}`}
                className={`-ml-px block border-l-2 py-1 transition-colors ${
                  h.level === 3 ? "pl-7 text-xs" : "pl-4"
                } ${
                  isActive
                    ? "border-accent font-semibold text-accent"
                    : "border-transparent text-fg-muted hover:text-fg"
                }`}
              >
                {h.text}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
