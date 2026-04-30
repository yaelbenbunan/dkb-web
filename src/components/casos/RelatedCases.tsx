import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import type { CaseStudy } from "@/lib/types";

export function RelatedCases({ cases }: { cases: CaseStudy[] }) {
  if (cases.length === 0) return null;
  // Duplicamos para que la marquee loopee sin saltos.
  const items = [...cases, ...cases];

  return (
    <section className="relative isolate overflow-hidden bg-[--color-bg-deep] py-20 md:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-dots opacity-30"
      />
      <Container className="mb-10 flex items-end justify-between">
        <h2
          className="font-bold leading-[1.05] tracking-tight"
          style={{ fontSize: "var(--text-display-md)" }}
        >
          Otros{" "}
          <span className="italic text-[--color-accent]">casos de éxito.</span>
        </h2>
        <Link
          href="/casos-de-exito"
          className="text-sm font-semibold text-[--color-accent] hover:text-[--color-accent-hover]"
        >
          Ver todos →
        </Link>
      </Container>

      {/* Marquee infinito de logos sin cuadro */}
      <div className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-[--color-bg-deep] to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-[--color-bg-deep] to-transparent"
        />

        <div className="flex w-max animate-marquee gap-16 will-change-transform py-4">
          {items.map((c, i) => (
            <Link
              key={`${c.slug}-${i}`}
              href={`/casos-de-exito/${c.slug}`}
              className="group flex h-28 w-52 shrink-0 items-center justify-center sm:h-32 sm:w-60"
              aria-label={c.client}
            >
              {c.clientLogo ? (
                <Image
                  src={c.clientLogo}
                  alt={c.client}
                  width={240}
                  height={120}
                  className="max-h-20 w-auto object-contain opacity-65 transition-all duration-300 group-hover:scale-110 group-hover:opacity-100 sm:max-h-24"
                />
              ) : (
                <span className="text-2xl font-bold text-[--color-fg-muted] transition-colors group-hover:text-[--color-fg]">
                  {c.client}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
