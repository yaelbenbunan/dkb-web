import Image from "next/image";
import { Container } from "@/components/ui/Container";
import type { CaseSection } from "@/lib/types";

export function CaseSections({ sections }: { sections: CaseSection[] }) {
  if (!sections.length) return null;
  return (
    <div className="space-y-24 py-20 md:space-y-32 md:py-28">
      {sections.map((section, idx) => (
        <Container key={`${section.tag}-${idx}`}>
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            {/* Izq: texto */}
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-[--color-accent]">
                {section.tag.replace(/-/g, " ")}
              </p>
              <h2 className="mt-4 text-2xl font-bold leading-tight tracking-tight md:text-3xl">
                {section.title}
              </h2>
              <div className="mt-6 space-y-4 text-[--color-fg-muted]">
                {section.body
                  .split(/\n\n+/)
                  .map((p, i) => (
                    <p key={i} className="leading-relaxed">
                      {p.trim()}
                    </p>
                  ))}
              </div>
            </div>

            {/* Der: galería */}
            <div className="grid gap-4">
              {section.images && section.images.length > 0 ? (
                section.images.map((src, i) => (
                  <div
                    key={src}
                    className="overflow-hidden rounded-2xl border border-[--color-border] bg-[--color-bg-elevated]"
                  >
                    <Image
                      src={src}
                      alt=""
                      width={1200}
                      height={800}
                      className="h-auto w-full object-cover"
                      priority={idx === 0 && i === 0}
                    />
                  </div>
                ))
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border border-dashed border-[--color-border-strong] bg-[--color-bg-subtle]">
                  <p className="text-sm text-[--color-fg-dim]">
                    Imágenes próximamente
                  </p>
                </div>
              )}
            </div>
          </div>
        </Container>
      ))}
    </div>
  );
}
