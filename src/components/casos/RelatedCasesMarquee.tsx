"use client";

import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { useEffect } from "react";
import { ClientLogoSwap } from "./ClientLogoSwap";
import type { CaseStudy } from "@/lib/types";

interface Props {
  cases: CaseStudy[];
}

/**
 * Carrusel de logos de casos relacionados con flechas + autoplay.
 * Muestra 2 logos en mobile y 4 en desktop. Avanza solo cada 4s; pausa al
 * interactuar con las flechas.
 */
export function RelatedCasesMarquee({ cases }: Props) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "start",
    containScroll: false,
    slidesToScroll: 1,
  });

  useEffect(() => {
    if (!emblaApi) return;
    const id = setInterval(() => emblaApi.scrollNext(), 4000);
    return () => clearInterval(id);
  }, [emblaApi]);

  if (cases.length === 0) return null;

  return (
    <div className="relative">
      {/* Viewport con margen lateral para reservar espacio a las flechas */}
      <div ref={emblaRef} className="overflow-hidden mx-12">
        <div className="flex">
          {cases.map((c) => (
            <div
              key={c.slug}
              className="min-w-0 flex-[0_0_25%] px-1"
            >
              <Link
                href={`/casos-de-exito/${c.slug}`}
                className="group flex aspect-[3/2] w-full items-center justify-center"
                aria-label={c.client}
              >
                {c.clientLogo ? (
                  <span className="transition-transform duration-300 group-hover:scale-110">
                    <ClientLogoSwap
                      src={c.clientLogo}
                      alt={c.client}
                      width={240}
                      height={120}
                      imgClassName="max-h-20 w-auto object-contain sm:max-h-24"
                    />
                  </span>
                ) : (
                  <span className="text-base font-semibold text-fg-muted transition-colors group-hover:text-fg">
                    {c.client}
                  </span>
                )}
              </Link>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => emblaApi?.scrollPrev()}
        aria-label="Anterior"
        className="absolute left-1 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border-strong bg-bg-elevated text-fg shadow-md transition-all hover:scale-105 hover:border-accent hover:text-accent"
      >
        <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
          <path
            d="M11 7H3m0 0l4-4m-4 4l4 4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => emblaApi?.scrollNext()}
        aria-label="Siguiente"
        className="absolute right-1 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border-strong bg-bg-elevated text-fg shadow-md transition-all hover:scale-105 hover:border-accent hover:text-accent"
      >
        <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
          <path
            d="M3 7h8m0 0L7 3m4 4l-4 4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
