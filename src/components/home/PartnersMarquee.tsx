import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { PARTNERS } from "@/lib/partners";

interface Props {
  heading?: string;
  /** Subtítulo opcional, p.ej. para la sección de nosotros con frase de alianzas */
  subheading?: string;
}

export function PartnersMarquee({
  heading = "Nuestros partners",
  subheading,
}: Props) {
  return (
    <section className="relative overflow-hidden bg-[--color-bg-subtle] py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-dots opacity-40"
      />
      <Container>
        {subheading ? (
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[--color-accent]">
              {heading}
            </p>
            <h2
              className="mt-4 font-bold leading-[1.15] tracking-tight"
              style={{ fontSize: "var(--text-display-md)" }}
            >
              {subheading}
            </h2>
          </div>
        ) : (
          <p className="text-center text-sm font-semibold uppercase tracking-[0.25em] text-[--color-fg-muted]">
            {heading}
          </p>
        )}
      </Container>

      <div className="relative mt-10 overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-[--color-bg-subtle] to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-[--color-bg-subtle] to-transparent"
        />

        <div className="flex w-max animate-marquee gap-10 will-change-transform">
          {[...PARTNERS, ...PARTNERS].map((p, i) => (
            <div
              key={`${p.name}-${i}`}
              className="flex h-24 w-44 shrink-0 items-center justify-center sm:h-28 sm:w-48"
            >
              <Image
                src={p.src}
                alt={p.name}
                width={342}
                height={164}
                className="h-16 w-auto object-contain opacity-60 grayscale transition hover:opacity-100 hover:grayscale-0 sm:h-20"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
