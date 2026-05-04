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

      {/* Overlay translúcido para legibilidad — cambia según el tema */}
      <div
        aria-hidden
        className="absolute inset-0 -z-20"
        style={{ background: "var(--hero-overlay)" }}
      />

      {/* Spotlight radial azul */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 spotlight-accent"
        style={{ ["--sx" as string]: "20%", ["--sy" as string]: "30%" }}
      />

      {/* Grid sutil */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-40 fade-edges-y"
      />

      {/* Noise grain */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-noise opacity-[0.06] mix-blend-overlay"
      />

      <Container className="relative grid gap-14 py-28 md:py-32 lg:grid-cols-[1.3fr_1fr] lg:gap-20">
        <div className="flex flex-col justify-center">
          {/* Headline tri-línea con misma tipografía. Rotating word es la única en azul. */}
          <h1 className="font-black leading-[0.95] tracking-tight text-fg">
            <span className="block text-5xl md:text-6xl lg:text-7xl">
              Hacemos
            </span>
            <span className="mt-1 block text-5xl md:text-6xl lg:text-7xl">
              <RotatingWord />
            </span>
            <span className="mt-1 block text-5xl md:text-6xl lg:text-7xl">
              increíbles.
            </span>
          </h1>

          <p className="mt-10 max-w-xl text-lg leading-relaxed text-fg-muted md:text-xl">
            Somos un equipo <span className="text-fg">multidisciplinar</span>,
            donde la <span className="text-accent">innovación</span> y la{" "}
            <span className="text-accent">creatividad</span> se unen para crear
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
