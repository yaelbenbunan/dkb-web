"use client";

import { useState } from "react";
import type { CaseStudy } from "@/lib/types";
import { CaseCard } from "./CaseCard";

interface Props {
  caseStudies: CaseStudy[];
  serviceTags: { slug: string; title: string }[];
}

export function CaseFilters({ caseStudies, serviceTags }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const filtered = active
    ? caseStudies.filter((c) => c.tags.includes(active))
    : caseStudies;

  const tabBase =
    "h-9 rounded-full px-4 text-sm font-medium transition-colors";
  const tabActive = "bg-[--color-accent] text-white";
  const tabInactive =
    "bg-[--color-bg-elevated] text-[--color-fg-muted] hover:bg-[--color-border-strong] hover:text-[--color-fg]";

  return (
    <>
      <div className="mt-8 flex flex-wrap gap-2">
        <button
          onClick={() => setActive(null)}
          className={`${tabBase} ${active === null ? tabActive : tabInactive}`}
        >
          Todos
        </button>
        {serviceTags.map((t) => (
          <button
            key={t.slug}
            onClick={() => setActive(t.slug)}
            className={`${tabBase} ${active === t.slug ? tabActive : tabInactive}`}
          >
            {t.title}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-12 text-[--color-fg-muted]">
          No hay casos para este filtro.
        </p>
      ) : (
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <CaseCard key={c.slug} caseStudy={c} />
          ))}
        </div>
      )}
    </>
  );
}
