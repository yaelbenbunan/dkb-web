"use client";

import { useState } from "react";
import type { ServiceFaq } from "@/lib/types";

export function ServiceFaqs({ faqs }: { faqs: ServiceFaq[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <ul className="divide-y divide-[--color-border]">
      {faqs.map((f, i) => {
        const isOpen = open === i;
        return (
          <li key={i}>
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-6 py-5 text-left"
            >
              <span className="text-base font-medium text-[--color-fg]">
                {f.q}
              </span>
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all ${
                  isOpen
                    ? "rotate-45 bg-[--color-accent] text-white"
                    : "bg-[--color-bg-elevated] text-[--color-fg-muted]"
                }`}
                aria-hidden
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M6 1v10M1 6h10"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </button>
            <div
              className={`grid overflow-hidden text-[--color-fg-muted] transition-[grid-template-rows] duration-300 ${
                isOpen ? "grid-rows-[1fr] pb-5" : "grid-rows-[0fr]"
              }`}
            >
              <div className="min-h-0 leading-relaxed">{f.a}</div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
