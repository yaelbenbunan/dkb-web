import Link from "next/link";
import { ClientLogoSwap } from "./ClientLogoSwap";
import type { CaseStudy } from "@/lib/types";

interface Props {
  cases: CaseStudy[];
}

/**
 * Marquee infinito de logos de casos relacionados. Auto-scroll continuo.
 * Pausa al hover (definido en globals.css). Cada logo es clickable.
 */
export function RelatedCasesMarquee({ cases }: Props) {
  if (cases.length === 0) return null;
  // Duplicamos para que la animación de -50% loopee sin saltos
  const items = [...cases, ...cases];

  return (
    <div className="relative overflow-hidden">
      {/* Fades laterales */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-[--color-bg] to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-[--color-bg] to-transparent"
      />

      <div className="flex w-max animate-marquee gap-5 will-change-transform">
        {items.map((c, i) => (
          <Link
            key={`${c.slug}-${i}`}
            href={`/casos-de-exito/${c.slug}`}
            className="group flex aspect-[3/2] w-40 shrink-0 items-center justify-center sm:w-48"
            aria-label={c.client}
          >
            {c.clientLogo ? (
              <span className="transition-transform duration-300 group-hover:scale-110">
                <ClientLogoSwap
                  src={c.clientLogo}
                  alt={c.client}
                  width={180}
                  height={80}
                  imgClassName="max-h-14 w-auto object-contain"
                />
              </span>
            ) : (
              <span className="text-base font-semibold text-[--color-fg-muted] transition-colors group-hover:text-[--color-fg]">
                {c.client}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
