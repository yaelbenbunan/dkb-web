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
    <section className="py-24 md:py-32">
      <Container>
        {/* Header dos columnas asimétricas */}
        <div className="grid gap-8 md:grid-cols-[1.6fr_1fr] md:items-end">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[--color-accent]">
              Nuestros servicios
            </p>
            <h2 className="mt-4 text-3xl font-bold leading-[1.1] tracking-tight md:text-5xl">
              Estrategias integrales para garantizar resultados exitosos.
            </h2>
          </div>
          <p className="text-[--color-fg-muted]">
            Diseñamos, desarrollamos y activamos cada palanca digital con un
            objetivo claro: convertir tu marca en un negocio que crece de forma
            sostenida.
          </p>
        </div>

        {/* Controles + carrusel */}
        <div className="mt-12 flex items-center justify-end gap-3">
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

      <div className="mt-8 overflow-hidden" ref={emblaRef}>
        <div className="flex touch-pan-y gap-5 pl-6 pr-[20vw] lg:pl-8">
          {services.map((s) => (
            <Link
              key={s.slug}
              href={`/servicios/${s.slug}`}
              className="group relative flex w-[280px] shrink-0 flex-col rounded-2xl border border-[--color-border] bg-[--color-bg-elevated] p-6 transition-colors hover:border-[--color-accent] sm:w-[320px]"
            >
              <div className="flex items-start justify-between">
                <Image
                  src={`/img/icons/servicios/${s.slug}.png`}
                  alt=""
                  width={44}
                  height={44}
                  className="h-11 w-11"
                />
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[--color-border-strong] text-[--color-fg-muted] transition-all group-hover:border-[--color-accent] group-hover:bg-[--color-accent] group-hover:text-white">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                  >
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
              <p className="mt-8 text-xl font-bold text-[--color-fg]">
                {s.title}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[--color-fg-muted]">
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
      className="flex h-11 w-11 items-center justify-center rounded-full border border-[--color-border-strong] bg-[--color-bg-elevated] text-[--color-fg] transition-colors hover:border-[--color-accent] hover:text-[--color-accent] disabled:cursor-not-allowed disabled:opacity-30"
      {...rest}
    >
      <svg
        width="14"
        height="14"
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
