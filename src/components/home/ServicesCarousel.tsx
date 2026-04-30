"use client";

import Image from "next/image";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";
import { Container } from "@/components/ui/Container";
import type { Service } from "@/lib/types";

interface Props {
  services: Pick<Service, "slug" | "title" | "shortDescription">[];
}

export function ServicesCarousel({ services }: Props) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: "start",
    dragFree: false,
    containScroll: "trimSnaps",
  });
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanPrev(emblaApi.canScrollPrev());
    setCanNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi, onSelect]);

  return (
    <section className="relative isolate overflow-hidden bg-[--color-bg-deep] py-28 md:py-36">
      {/* Grid sutil de fondo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-50"
      />
      {/* Spotlight superior */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 spotlight-accent"
        style={{ ["--sx" as string]: "50%", ["--sy" as string]: "0%" }}
      />

      <Container>
        <div className="grid gap-10 md:grid-cols-[1.6fr_1fr] md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[--color-accent]">
              Nuestros servicios
            </p>
            <h2
              className="mt-6 font-black leading-[0.95] tracking-tight"
              style={{ fontSize: "var(--text-display-lg)" }}
            >
              Estrategias{" "}
              <span className="text-[--color-accent]">integrales</span>{" "}
              para garantizar{" "}
              <span className="italic text-[--color-accent]">resultados</span>{" "}
              exitosos.
            </h2>
          </div>
          <p className="text-lg text-[--color-fg-muted]">
            Diseñamos, desarrollamos y activamos cada palanca digital con un
            objetivo claro:{" "}
            <span className="text-[--color-fg]">
              convertir tu marca en un negocio que crece de forma sostenida.
            </span>
          </p>
        </div>

        <div className="mt-14 flex items-center justify-end gap-3">
          <CarouselButton
            disabled={!canPrev}
            onClick={() => emblaApi?.scrollPrev()}
            aria-label="Anterior"
            direction="prev"
          />
          <CarouselButton
            disabled={!canNext}
            onClick={() => emblaApi?.scrollNext()}
            aria-label="Siguiente"
            direction="next"
          />
        </div>
      </Container>

      <div className="relative mt-10 overflow-hidden" ref={emblaRef}>
        <div className="flex touch-pan-y gap-5 pl-6 pr-[20vw] lg:pl-8">
          {services.map((s) => (
            <Link
              key={s.slug}
              href={`/servicios/${s.slug}`}
              className="group relative flex w-[290px] shrink-0 flex-col rounded-3xl border border-[--color-border] bg-[--color-bg-elevated] p-7 transition-all hover:-translate-y-1 hover:border-[--color-accent] sm:w-[340px]"
            >
              {/* Glow superior en hover */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[--color-accent] to-transparent opacity-0 transition-opacity group-hover:opacity-100"
              />

              <div className="flex items-start justify-between">
                <Image
                  src={`/img/icons/servicios/${s.slug}.png`}
                  alt=""
                  width={48}
                  height={48}
                  className="h-12 w-12"
                />
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[--color-border-strong] text-[--color-fg-muted] transition-all group-hover:rotate-[-8deg] group-hover:border-[--color-accent] group-hover:bg-[--color-accent] group-hover:text-white">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M4 10L10 4M10 4H5M10 4V9"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </div>
              <p className="mt-10 text-2xl font-bold leading-tight text-[--color-fg]">
                {s.title}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[--color-fg-muted]">
                {s.shortDescription}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function CarouselButton({
  disabled,
  onClick,
  direction,
  ...rest
}: {
  disabled?: boolean;
  onClick: () => void;
  direction: "prev" | "next";
  "aria-label": string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex h-12 w-12 items-center justify-center rounded-full border border-[--color-border-strong] bg-[--color-bg-elevated] text-[--color-fg] transition-all hover:scale-105 hover:border-[--color-accent] hover:text-[--color-accent] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100"
      {...rest}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 14 14"
        fill="none"
        className={direction === "prev" ? "rotate-180" : ""}
      >
        <path
          d="M3 7h8m0 0L7 3m4 4l-4 4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
