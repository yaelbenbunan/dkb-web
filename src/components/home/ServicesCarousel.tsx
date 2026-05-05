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
    loop: true,
    align: "start",
    dragFree: false,
    containScroll: "trimSnaps",
  });
  const [canPrev, setCanPrev] = useState(true);
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
    // Auto-avance cada 5s. Pausa al hacer hover sobre el track.
    const id = setInterval(() => emblaApi.scrollNext(), 5000);
    return () => clearInterval(id);
  }, [emblaApi, onSelect]);

  return (
    <section className="relative isolate overflow-hidden bg-bg-deep py-20 md:py-24">
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
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
              Nuestros servicios
            </p>
            <h2
              className="mt-6 font-black leading-[0.95] tracking-tight"
              style={{ fontSize: "var(--text-display-lg)" }}
            >
              Estrategias{" "}
              <span className="text-accent">integrales</span>{" "}
              para garantizar{" "}
              <span className="italic text-accent">resultados</span>{" "}
              exitosos.
            </h2>
          </div>
          <p className="text-lg text-fg-muted">
            Diseñamos, desarrollamos y activamos cada palanca digital con un
            objetivo claro:{" "}
            <span className="text-fg">
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

      {/* py-4 da espacio para el hover lift sin que se corte el ring superior */}
      <div className="relative mt-10 overflow-hidden py-4" ref={emblaRef}>
        <div className="flex touch-pan-y gap-5 pl-6 pr-[20vw] lg:pl-8">
          {services.map((s) => (
            <Link
              key={s.slug}
              href={`/servicios/${s.slug}`}
              className="surface surface-hover group relative flex w-[280px] shrink-0 flex-col rounded-2xl px-6 pb-6 pt-4 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_-15px_rgba(24,123,239,0.4)] sm:w-[320px]"
            >
              <div className="flex items-start justify-between">
                <Image
                  src={`/img/icons/servicios/${s.slug}.png`}
                  alt=""
                  width={44}
                  height={44}
                  className="h-11 w-11"
                />
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-fg-muted transition-all group-hover:rotate-[-8deg] group-hover:bg-[#187bef] group-hover:text-white">
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
              <p className="mt-6 text-xl font-bold leading-tight text-fg">
                {s.title}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">
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
      className="surface flex h-12 w-12 items-center justify-center rounded-full text-fg transition-all hover:scale-105 hover:text-[#3a90f2] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100"
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
