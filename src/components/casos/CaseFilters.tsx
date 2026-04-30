"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { CaseStudy } from "@/lib/types";

interface Props {
  caseStudies: CaseStudy[];
  /** Tags expuestos como tabs (subset de los servicios). Por defecto los 4 del doc. */
  filterTags?: { slug: string; title: string }[];
}

const DEFAULT_TABS = [
  { slug: "desarrollo-web", title: "Desarrollo web" },
  { slug: "ecommerce", title: "Ecommerce" },
  { slug: "sem", title: "SEM" },
  { slug: "social-paid-media", title: "Social & Paid Media" },
];

export function CaseFilters({ caseStudies, filterTags = DEFAULT_TABS }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const filtered = active
    ? caseStudies.filter((c) => c.tags.includes(active))
    : caseStudies;

  const tabBase =
    "h-10 rounded-full px-5 text-sm font-medium transition-colors";
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
        {filterTags.map((t) => (
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
        <p className="mt-16 text-[--color-fg-muted]">
          No hay casos para este filtro todavía.
        </p>
      ) : (
        <ul className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/casos-de-exito/${c.slug}`}
                className="group flex aspect-[4/3] flex-col items-center justify-center rounded-2xl border border-[--color-border] bg-[--color-bg-elevated] p-6 transition-all hover:-translate-y-1 hover:border-[--color-accent]"
              >
                {c.clientLogo ? (
                  <Image
                    src={c.clientLogo}
                    alt={c.client}
                    width={160}
                    height={64}
                    className="max-h-14 w-auto object-contain opacity-80 transition group-hover:opacity-100"
                  />
                ) : (
                  <span className="text-xl font-bold text-[--color-fg]">
                    {c.client}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
