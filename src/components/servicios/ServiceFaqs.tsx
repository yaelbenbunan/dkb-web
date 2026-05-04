"use client";

import { useState } from "react";
import type { ServiceFaq } from "@/lib/types";

export function ServiceFaqs({ faqs }: { faqs: ServiceFaq[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <ul className="space-y-3">
      {faqs.map((f, i) => {
        const isOpen = open === i;
        return (
          <li key={i} className="surface rounded-2xl">

            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-6 p-5 text-left"
            >
              <span className="text-base font-semibold text-fg md:text-lg">
                {f.q}
              </span>
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all ${
                  isOpen
                    ? "rotate-45 bg-accent text-white"
                    : "bg-accent-soft text-accent"
                }`}
                aria-hidden
              >
                <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M6 1v10M1 6h10"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </button>
            <div
              className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ${
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="min-h-0">
                <p className="px-5 pb-5 leading-relaxed text-fg-muted">
                  {f.a}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
