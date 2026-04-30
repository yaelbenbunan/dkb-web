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
      {/* Imagen de fondo */}
      <Image
        src="/img/home/hero-bg.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-20 object-cover object-center"
      />

      {/* Overlay degradado: oscurece la izquierda (donde va el texto) y suaviza
          la derecha (donde va el form). Asegura contraste sea cual sea la imagen. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(90deg, rgba(14,16,21,0.95) 0%, rgba(14,16,21,0.75) 50%, rgba(14,16,21,0.6) 100%)",
        }}
      />

      {/* Glow azul decorativo arriba a la izquierda */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 15% 20%, rgba(24,123,239,0.2), transparent 70%)",
        }}
      />

      <Container className="relative grid gap-12 py-24 md:py-32 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
        <div className="flex flex-col justify-center">
          <p className="text-sm font-medium uppercase tracking-widest text-[--color-accent]">
            dinkbit · España
          </p>
          <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight text-[--color-fg] md:text-6xl lg:text-7xl">
            Hacemos
            <br />
            <RotatingWord />
            <br />
            increíbles.
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-[--color-fg-muted]">
            Somos un equipo multidisciplinar, donde la innovación y la
            creatividad se unen para crear soluciones que impulsan tu marca y te
            ayudan a conseguir los mejores resultados.
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
