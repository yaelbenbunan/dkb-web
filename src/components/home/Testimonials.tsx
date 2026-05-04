"use client";

import useEmblaCarousel from "embla-carousel-react";
import { useEffect } from "react";
import { Container } from "@/components/ui/Container";
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

  useEffect(() => {
    if (!emblaApi) return;
    const id = setInterval(() => emblaApi.scrollNext(), 7000);
    return () => clearInterval(id);
  }, [emblaApi]);

  return (
    <section className="relative isolate overflow-hidden py-20 md:py-24">
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
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-accent">
            <span aria-hidden>★</span> Testimonios
          </p>
          <h2
            className="mt-6 font-black leading-[0.95] tracking-tight"
            style={{ fontSize: "var(--text-display-lg)" }}
          >
            Opiniones de{" "}
            <span className="italic text-accent">nuestros clientes.</span>
          </h2>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {/* Rating summary card — sobria, mismo lenguaje que el resto */}
          <div className="surface flex min-w-0 flex-col rounded-3xl p-8">
            <div className="flex items-baseline gap-2">
              <p className="text-6xl font-black leading-none text-accent">
                5.0
              </p>
              <p className="text-sm font-medium text-fg-muted">/ 5</p>
            </div>
            <div className="mt-4">
              <Stars count={5} size={18} />
            </div>
            <p className="mt-auto pt-8 text-sm text-fg-muted">
              <span className="font-semibold text-fg">30+ reviews</span>{" "}
              de Google.
            </p>
            <a
              href={GOOGLE_REVIEWS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:text-accent-hover"
            >
              Leer todas →
            </a>
          </div>

          {/* Reviews carousel */}
          <div className="min-w-0 md:col-span-2">
            <div className="surface relative h-full rounded-3xl">
              <div ref={emblaRef} className="h-full overflow-hidden rounded-3xl">
                <div className="flex">
                  {TESTIMONIALS.map((t, i) => (
                    <div
                      key={i}
                      className="min-w-0 flex-[0_0_100%] p-8 sm:p-10"
                    >
                      <Stars count={t.rating} size={16} />
                      <blockquote className="mt-5 text-base leading-relaxed text-fg md:text-lg">
                        <span className="text-accent">“</span>
                        {t.body}
                        <span className="text-accent">”</span>
                      </blockquote>
                      <p className="mt-6 text-sm font-bold text-fg">
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
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-border-strong bg-bg text-fg hover:border-accent hover:text-accent"
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
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-border-strong bg-bg text-fg hover:border-accent hover:text-accent"
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

            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
