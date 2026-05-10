import Image from "next/image";
import { Container } from "@/components/ui/Container";
import type { CaseImage, CaseSection, MockupKind } from "@/lib/types";

function normalize(image: string | CaseImage): { src: string; mockup: MockupKind; alt: string } {
  if (typeof image === "string") {
    return { src: image, mockup: "none", alt: "" };
  }
  return { src: image.src, mockup: image.mockup ?? "none", alt: image.alt ?? "" };
}

function hostFromUrl(url?: string): string {
  if (!url) return "";
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function CaseSections({
  sections,
  websiteUrl,
}: {
  sections: CaseSection[];
  websiteUrl?: string;
}) {
  if (!sections.length) return null;
  const domain = hostFromUrl(websiteUrl);

  return (
    <div className="space-y-20 py-16 md:space-y-28 md:py-20">
      {sections.map((section, idx) => {
        const images = (section.images ?? []).map(normalize);
        const hasMultipleImages = images.length > 1;
        return (
          <Container key={`${section.tag}-${idx}`}>
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
              {/* Izq: texto. Sticky cuando hay 2+ imágenes. */}
              <div
                className={
                  hasMultipleImages
                    ? "lg:sticky lg:top-28 lg:h-max lg:self-start"
                    : ""
                }
              >
                <span className="inline-flex h-7 w-fit items-center rounded-full bg-accent/15 px-3.5 text-[11px] font-bold uppercase tracking-[0.22em] text-accent-hover ring-1 ring-accent/35">
                  {section.tag.replace(/-/g, " ")}
                </span>
                <h2
                  className="mt-5 font-bold leading-[1.15] tracking-tight"
                  style={{ fontSize: "var(--text-display-md)" }}
                >
                  {section.title}
                </h2>
                <div className="mt-6 space-y-4 text-base leading-relaxed text-fg-muted md:text-lg">
                  {section.body
                    .split(/\n\n+/)
                    .map((p, i) => (
                      <p key={i}>{p.trim()}</p>
                    ))}
                </div>
              </div>

              {/* Der: galería de mockups */}
              <div className="space-y-6">
                {images.length > 0 ? (
                  images.map((img, i) => (
                    <MockupFrame
                      key={`${img.src}-${i}`}
                      kind={img.mockup}
                      src={img.src}
                      alt={img.alt}
                      domain={domain}
                      priority={idx === 0 && i === 0}
                    />
                  ))
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-bg-subtle ring-1 ring-white/[0.05]">
                    <p className="text-sm text-fg-dim">
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

function MockupFrame({
  kind,
  src,
  alt,
  domain,
  priority,
}: {
  kind: MockupKind;
  src: string;
  alt: string;
  domain?: string;
  priority?: boolean;
}) {
  if (kind === "desktop") {
    return (
      <div
        className="overflow-hidden rounded-2xl ring-1"
        style={{
          backgroundColor: "var(--mockup-body)",
          boxShadow: "var(--mockup-shadow)",
          ["--tw-ring-color" as string]: "var(--mockup-ring)",
        }}
      >
        {/* Browser chrome */}
        <div
          className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3"
          style={{ backgroundColor: "var(--mockup-chrome-bg)" }}
        >
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          {domain && (
            <span className="ml-3 hidden flex-1 truncate rounded-md bg-white/[0.05] px-3 py-1 text-xs text-white/40 sm:block">
              {domain}
            </span>
          )}
        </div>
        <Image
          src={src}
          alt={alt}
          width={1600}
          height={1000}
          priority={priority}
          className="h-auto w-full object-cover"
        />
      </div>
    );
  }

  if (kind === "mobile") {
    return (
      <div
        className="mx-auto w-full max-w-[280px] rounded-[2rem] p-2 ring-1"
        style={{
          backgroundColor: "var(--mockup-body)",
          boxShadow: "var(--mockup-shadow)",
          ["--tw-ring-color" as string]: "var(--mockup-ring)",
        }}
      >
        {/* Phone notch */}
        <div
          className="relative overflow-hidden rounded-[1.6rem]"
          style={{ backgroundColor: "var(--mockup-screen-bg)" }}
        >
          <span className="absolute left-1/2 top-2 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-black/80" />
          <Image
            src={src}
            alt={alt}
            width={400}
            height={800}
            priority={priority}
            className="h-auto w-full object-cover"
          />
        </div>
      </div>
    );
  }

  if (kind === "mobile-tilt") {
    return (
      <div className="mx-auto py-8" style={{ perspective: "1400px" }}>
        <div
          className="group mx-auto w-full max-w-[260px] rounded-[2rem] p-2 ring-1"
          style={{
            backgroundColor: "var(--mockup-body)",
            boxShadow: "var(--mockup-shadow-tilt)",
            ["--tw-ring-color" as string]: "var(--mockup-ring)",
            transform: "rotateY(-18deg) rotateX(6deg) rotateZ(-3deg)",
            transformStyle: "preserve-3d",
          }}
        >
          <div
            className="relative overflow-hidden rounded-[1.6rem]"
            style={{ backgroundColor: "var(--mockup-screen-bg)" }}
          >
            <span className="absolute left-1/2 top-2 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-black/80" />
            <Image
              src={src}
              alt={alt}
              width={400}
              height={800}
              priority={priority}
              className="h-auto w-full object-cover"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl shadow-[0_25px_50px_-15px_rgba(0,0,0,0.5)]">
      <Image
        src={src}
        alt={alt}
        width={1200}
        height={800}
        priority={priority}
        className="h-auto w-full object-cover"
      />
    </div>
  );
}
