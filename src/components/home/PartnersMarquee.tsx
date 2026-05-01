import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { PARTNERS } from "@/lib/partners";

export function PartnersMarquee({
  heading = "Nuestros partners",
}: {
  heading?: string;
}) {
  return (
    <section className="relative overflow-hidden bg-[--color-bg-subtle] py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-dots opacity-40"
      />
      <Container>
        <p className="text-center text-sm font-semibold uppercase tracking-[0.25em] text-[--color-fg-muted]">
          {heading}
        </p>
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

        <div className="flex w-max animate-marquee gap-24 will-change-transform">
          {[...PARTNERS, ...PARTNERS].map((p, i) => (
            <div
              key={`${p.name}-${i}`}
              className="flex h-24 w-48 shrink-0 items-center justify-center sm:h-28 sm:w-56"
            >
              <Image
                src={p.src}
                alt={p.name}
                width={342}
                height={164}
                className="max-h-20 w-auto object-contain opacity-60 grayscale transition hover:opacity-100 hover:grayscale-0 sm:max-h-24"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
