"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { CaseStudy } from "@/lib/types";

interface Props {
  caseStudies: CaseStudy[];
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
    "h-12 rounded-full px-7 text-base font-semibold transition-all";
  const tabActive =
    "bg-[#187bef] text-white shadow-[0_8px_24px_-6px_rgba(24,123,239,0.7),inset_0_1px_0_rgba(255,255,255,0.25)]";
  const tabInactive =
    "bg-[#187bef]/10 text-[#3a90f2] ring-1 ring-[#187bef]/25 hover:bg-[#187bef]/20 hover:ring-[#187bef]/50";

  return (
    <>
      <div className="flex flex-wrap justify-center gap-3">
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
        <p className="mt-16 text-center text-[--color-fg-muted]">
          No hay casos para este filtro todavía.
        </p>
      ) : (
        <ul className="mt-14 grid grid-cols-2 gap-x-8 gap-y-12 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/casos-de-exito/${c.slug}`}
                className="group flex aspect-[3/2] items-center justify-center transition-transform duration-300 hover:scale-105"
                aria-label={c.client}
              >
                {c.clientLogo ? (
                  <Image
                    src={c.clientLogo}
                    alt={c.client}
                    width={240}
                    height={120}
                    className="max-h-20 w-auto object-contain brightness-0 invert opacity-60 transition-all duration-300 group-hover:brightness-100 group-hover:invert-0 group-hover:opacity-100"
                  />
                ) : (
                  <span className="text-xl font-bold text-[--color-fg-muted] transition-colors group-hover:text-[--color-fg]">
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
