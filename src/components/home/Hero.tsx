import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { RotatingWord } from "./RotatingWord";
import { HeroForm } from "./HeroForm";
import { getAllServices } from "@/lib/content";

export function Hero() {
  const services = getAllServices().map((s) => ({
    slug: s.slug,
    title: s.title,
  }));

  return (
    <section className="relative isolate overflow-hidden">
      {/* Foto de fondo */}
      <Image
        src="/img/home/hero-bg.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-30 object-cover object-center"
      />

      {/* Overlay translúcido: deja respirar la foto, pero asegura contraste detrás del texto */}
      <div
        aria-hidden
        className="absolute inset-0 -z-20"
        style={{
          background:
            "linear-gradient(135deg, rgba(8,9,13,0.78) 0%, rgba(14,16,21,0.55) 45%, rgba(14,16,21,0.25) 100%)",
        }}
      />

      {/* Spotlight radial azul */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 spotlight-accent"
        style={{ ["--sx" as string]: "20%", ["--sy" as string]: "30%" }}
      />

      {/* Grid decorativo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-50 fade-edges-y"
      />

      {/* Noise grain */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-noise opacity-[0.06] mix-blend-overlay"
      />

      <Container className="relative grid gap-14 py-28 md:py-36 lg:grid-cols-[1.3fr_1fr] lg:gap-20">
        <div className="flex flex-col justify-center">
          {/* Eyebrow con dot animado */}
          <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.25em] text-[--color-accent]">
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[--color-accent] animate-ping-soft" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[--color-accent]" />
            </span>
            dinkbit · España
          </p>

          {/* Headline con jerarquía marcada: "Hacemos" pequeño, palabra rotante MASIVA, "increíbles" mediano */}
          <h1 className="mt-8 font-bold leading-[0.95] tracking-tight text-[--color-fg]">
            <span className="block text-2xl font-medium uppercase tracking-[0.2em] text-[--color-fg-muted] md:text-3xl">
              Hacemos
            </span>
            <span
              className="mt-3 block font-black leading-[0.9]"
              style={{ fontSize: "var(--text-display-xl)" }}
            >
              <RotatingWord />
            </span>
            <span className="mt-2 block text-4xl italic text-[--color-fg] md:text-6xl lg:text-7xl">
              increíbles.
            </span>
          </h1>

          <p className="mt-10 max-w-xl text-lg leading-relaxed text-[--color-fg-muted] md:text-xl">
            Somos un equipo <span className="text-[--color-fg]">multidisciplinar</span>,
            donde la <span className="text-[--color-accent]">innovación</span> y la{" "}
            <span className="text-[--color-accent]">creatividad</span> se unen para crear
            soluciones que impulsan tu marca y te ayudan a conseguir los mejores resultados.
          </p>
        </div>

        <div className="flex items-center">
          <div className="w-full">
            <HeroForm services={services} />
          </div>
        </div>
      </Container>
    </section>
  );
}
