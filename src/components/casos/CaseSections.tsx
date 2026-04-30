import Image from "next/image";
import { Container } from "@/components/ui/Container";
import type { CaseSection } from "@/lib/types";

export function CaseSections({ sections }: { sections: CaseSection[] }) {
  if (!sections.length) return null;
  return (
    <div className="space-y-20 py-16 md:space-y-28 md:py-20">
      {sections.map((section, idx) => {
        const hasMultipleImages = (section.images?.length ?? 0) > 1;
        return (
          <Container key={`${section.tag}-${idx}`}>
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
              {/* Izq: texto. Sticky cuando hay 2+ imágenes para que se mantenga visible mientras scroleas. */}
              <div
                className={
                  hasMultipleImages
                    ? "lg:sticky lg:top-28 lg:h-max lg:self-start"
                    : ""
                }
              >
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[--color-accent]">
                  {section.tag.replace(/-/g, " ")}
                </p>
                <h2
                  className="mt-5 font-bold leading-[1.15] tracking-tight"
                  style={{ fontSize: "var(--text-display-md)" }}
                >
                  {section.title}
                </h2>
                <div className="mt-6 space-y-4 text-base leading-relaxed text-[--color-fg-muted] md:text-lg">
                  {section.body
                    .split(/\n\n+/)
                    .map((p, i) => (
                      <p key={i}>{p.trim()}</p>
                    ))}
                </div>
              </div>

              {/* Der: galería. Stacked, sin bordes — solo rounded + soft shadow. */}
              <div className="space-y-4">
                {section.images && section.images.length > 0 ? (
                  section.images.map((src, i) => (
                    <div
                      key={src}
                      className="overflow-hidden rounded-2xl shadow-[0_25px_50px_-15px_rgba(0,0,0,0.5)]"
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
                  <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-[--color-bg-subtle] ring-1 ring-white/[0.05]">
                    <p className="text-sm text-[--color-fg-dim]">
                      Imágenes próximamente
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Container>
        );
      })}
    </div>
  );
}
