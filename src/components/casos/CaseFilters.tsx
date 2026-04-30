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

  return (
    <>
      <div className="mt-8 flex flex-wrap gap-2">
        <button
          onClick={() => setActive(null)}
          className={`h-9 rounded-full px-4 text-sm font-medium ${
            active === null
              ? "bg-[--color-primary] text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Todos
        </button>
        {serviceTags.map((t) => (
          <button
            key={t.slug}
            onClick={() => setActive(t.slug)}
            className={`h-9 rounded-full px-4 text-sm font-medium ${
              active === t.slug
                ? "bg-[--color-primary] text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {t.title}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-12 text-slate-600">No hay casos para este filtro.</p>
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
