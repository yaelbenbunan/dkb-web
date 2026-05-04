"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { NAV_ITEMS } from "@/lib/nav";

export function MobileMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="relative z-50 inline-flex h-10 w-10 items-center justify-center rounded-md text-white hover:bg-white/10"
      >
        <span className="sr-only">Menú</span>
        <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
          <path
            d={open ? "M5 5l10 10M15 5L5 15" : "M3 6h14M3 10h14M3 14h14"}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open && (
        <>
          <button
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          />
          <div className="fixed inset-x-0 top-20 z-40 border-b border-white/10 bg-[#0e1015] shadow-2xl">
            <nav className="flex flex-col gap-1 p-4">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-3 text-base font-medium text-white/80 hover:bg-white/5 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
