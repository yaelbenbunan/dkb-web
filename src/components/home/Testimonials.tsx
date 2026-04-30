"use client";

import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { TESTIMONIALS, GOOGLE_REVIEWS_URL } from "@/lib/testimonials";

function Stars({ count = 5, max = 5, size = 18 }: { count?: number; max?: number; size?: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <svg
          key={i}
          width={size}
          height={size}
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
    <section className="relative isolate overflow-hidden py-28 md:py-36">
      {/* Spotlight detrás del bloque */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 spotlight-accent"
        style={{ ["--sx" as string]: "70%", ["--sy" as string]: "40%" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-grid-fine opacity-30 fade-edges-y"
      />

      <Container>
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-[--color-accent]">
              <span aria-hidden>★</span> Testimonios
            </p>
            <h2
              className="mt-6 font-black leading-[0.95] tracking-tight"
              style={{ fontSize: "var(--text-display-lg)" }}
            >
              Opiniones de{" "}
              <span className="italic text-[--color-accent]">nuestros clientes.</span>
            </h2>
          </div>
          <ButtonLink
            href={GOOGLE_REVIEWS_URL}
            target="_blank"
            rel="noopener noreferrer"
            size="lg"
          >
            Ver en Google →
          </ButtonLink>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {/* Rating summary card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[--color-accent] via-[#1a6fd9] to-[#0f4a9c] p-8 text-white">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-noise opacity-[0.08] mix-blend-overlay"
            />
            <p className="relative text-7xl font-black leading-none">5.0</p>
            <div className="relative mt-4">
              <Stars count={5} size={20} />
            </div>
            <p className="relative mt-8 text-sm text-white/80">
              30+ reviews de Google
            </p>
            <a
              href={GOOGLE_REVIEWS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="relative mt-2 inline-flex items-center gap-1 text-sm font-semibold text-white hover:underline"
            >
              Leer todas →
            </a>
          </div>

          {/* Reviews carousel */}
          <div className="md:col-span-2">
            <div className="relative h-full rounded-3xl border border-[--color-border] bg-[--color-bg-elevated]">
              <div ref={emblaRef} className="h-full overflow-hidden rounded-3xl">
                <div className="flex">
                  {TESTIMONIALS.map((t, i) => (
                    <div
                      key={i}
                      className="min-w-0 flex-[0_0_100%] p-10 sm:p-12"
                    >
                      <Stars count={t.rating} size={20} />
                      <blockquote className="mt-6 text-xl leading-relaxed text-[--color-fg] md:text-2xl">
                        <span className="text-[--color-accent]">“</span>
                        {t.body}
                        <span className="text-[--color-accent]">”</span>
                      </blockquote>
                      <p className="mt-8 text-base font-bold text-[--color-fg]">
                        — {t.author}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="absolute bottom-6 right-6 flex gap-2">
                <button
                  onClick={() => emblaApi?.scrollPrev()}
                  aria-label="Anterior"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[--color-border-strong] bg-[--color-bg] text-[--color-fg] hover:border-[--color-accent] hover:text-[--color-accent]"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
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
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[--color-border-strong] bg-[--color-bg] text-[--color-fg] hover:border-[--color-accent] hover:text-[--color-accent]"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
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

              <div className="absolute bottom-9 left-10 flex gap-1.5">
                {TESTIMONIALS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => emblaApi?.scrollTo(i)}
                    aria-label={`Testimonio ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all ${
                      selected === i
                        ? "w-8 bg-[--color-accent]"
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
