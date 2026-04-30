"use client";

import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { TESTIMONIALS, GOOGLE_REVIEWS_URL } from "@/lib/testimonials";

function Stars({ count = 5, max = 5 }: { count?: number; max?: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <svg
          key={i}
          width="18"
          height="18"
          viewBox="0 0 20 20"
          fill={i < count ? "#187bef" : "rgba(24,123,239,0.25)"}
        >
          <path d="M10 1.5l2.62 5.31 5.86.85-4.24 4.13 1 5.84L10 14.88l-5.24 2.75 1-5.84L1.52 7.66l5.86-.85L10 1.5z" />
        </svg>
      ))}
    </div>
  );
}

export function Testimonials() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" });
  const [selected, setSelected] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelected(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    const id = setInterval(() => emblaApi.scrollNext(), 7000);
    return () => clearInterval(id);
  }, [emblaApi, onSelect]);

  return (
    <section className="py-24 md:py-32">
      <Container>
        {/* Header */}
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[--color-accent]">
              ★ Testimonios
            </p>
            <h2 className="mt-4 text-3xl font-bold leading-[1.1] tracking-tight md:text-5xl">
              Opiniones de nuestros clientes.
            </h2>
          </div>
          <ButtonLink
            href={GOOGLE_REVIEWS_URL}
            target="_blank"
            rel="noopener noreferrer"
            size="md"
          >
            Ver en Google
          </ButtonLink>
        </div>

        {/* Contenido */}
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {/* Rating summary card */}
          <div className="rounded-2xl border border-[--color-border] bg-[--color-bg-elevated] p-8">
            <p className="text-6xl font-bold text-[--color-fg]">5.0</p>
            <Stars count={5} />
            <p className="mt-6 text-sm text-[--color-fg-muted]">
              30+ Reviews de Google
            </p>
            <a
              href={GOOGLE_REVIEWS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-[--color-accent] hover:text-[--color-accent-hover]"
            >
              Leer todas →
            </a>
          </div>

          {/* Reviews carousel */}
          <div className="md:col-span-2">
            <div className="relative h-full rounded-2xl border border-[--color-border] bg-[--color-bg-elevated]">
              <div ref={emblaRef} className="h-full overflow-hidden rounded-2xl">
                <div className="flex">
                  {TESTIMONIALS.map((t, i) => (
                    <div
                      key={i}
                      className="min-w-0 flex-[0_0_100%] p-8 sm:p-10"
                    >
                      <Stars count={t.rating} />
                      <blockquote className="mt-6 text-lg leading-relaxed text-[--color-fg]">
                        “{t.body}”
                      </blockquote>
                      <p className="mt-6 font-semibold text-[--color-fg]">
                        — {t.author}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Controles */}
              <div className="absolute bottom-6 right-6 flex gap-2">
                <button
                  onClick={() => emblaApi?.scrollPrev()}
                  aria-label="Anterior"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[--color-border-strong] bg-[--color-bg] text-[--color-fg] hover:border-[--color-accent] hover:text-[--color-accent]"
                >
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
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
                  onClick={() => emblaApi?.scrollNext()}
                  aria-label="Siguiente"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[--color-border-strong] bg-[--color-bg] text-[--color-fg] hover:border-[--color-accent] hover:text-[--color-accent]"
                >
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
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

              {/* Dots */}
              <div className="absolute bottom-9 left-8 flex gap-1.5">
                {TESTIMONIALS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => emblaApi?.scrollTo(i)}
                    aria-label={`Testimonio ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all ${
                      selected === i
                        ? "w-6 bg-[--color-accent]"
                        : "w-1.5 bg-[--color-border-strong]"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
