import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { PARTNERS } from "@/lib/partners";

export function PartnersMarquee({
  heading = "Nuestros partners",
}: {
  heading?: string;
}) {
  return (
    <section className="border-y border-[--color-border] bg-[--color-bg-subtle] py-14">
      <Container>
        <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-[--color-fg-dim]">
          {heading}
        </p>
      </Container>

      <div className="relative mt-8 overflow-hidden">
        {/* Fades laterales para que no se vea el corte */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[--color-bg-subtle] to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[--color-bg-subtle] to-transparent"
        />

        <div className="flex w-max animate-marquee gap-16 will-change-transform">
          {[...PARTNERS, ...PARTNERS].map((p, i) => (
            <div
              key={`${p.name}-${i}`}
              className="flex h-12 w-32 shrink-0 items-center justify-center"
            >
              <Image
                src={p.src}
                alt={p.name}
                width={160}
                height={48}
                className="max-h-12 w-auto object-contain opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
