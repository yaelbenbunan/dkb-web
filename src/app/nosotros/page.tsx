import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { WhyUs } from "@/components/nosotros/WhyUs";
import { Process } from "@/components/nosotros/Process";
import { Manifesto } from "@/components/nosotros/Manifesto";
import { Counters } from "@/components/nosotros/Counters";
import { PartnersMarquee } from "@/components/home/PartnersMarquee";
import { TeamGrid } from "@/components/nosotros/TeamGrid";

export const metadata = {
  title: "Nosotros — dinkbit",
  description:
    "Equipo multidisciplinar con 15+ años de experiencia. Diseño, desarrollo, paid media y SEO bajo el mismo techo.",
};

export default function NosotrosPage() {
  return (
    <>
      {/* Hero con foto de la oficina como bg + overlay azul */}
      <header className="relative isolate overflow-hidden">
        <Image
          src="/img/nosotros/mosaico-oficina.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-30 object-cover object-center opacity-30"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-20"
          style={{
            background:
              "linear-gradient(135deg, rgba(8,9,13,0.72) 0%, rgba(12,28,64,0.7) 50%, rgba(14,16,21,0.4) 100%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 60% 70% at 25% 30%, rgba(58,144,242,0.32), transparent 65%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-25 fade-edges-y"
        />

        <Container className="relative py-24 md:py-32">
          <p className="inline-flex items-center gap-2 rounded-full bg-[#187bef]/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.25em] text-[#3a90f2] ring-1 ring-[#187bef]/30">
            <span className="relative inline-flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[#3a90f2] animate-ping-soft" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#3a90f2]" />
            </span>
            Nosotros
          </p>
          <h1
            className="mt-8 max-w-5xl font-black leading-[0.92] tracking-tight"
            style={{ fontSize: "var(--text-display-xl)" }}
          >
            Una agencia digital,{" "}
            <span className="italic text-[#3a90f2]">hecha para construir.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-[#cfdcf2] md:text-xl">
            Diseño, desarrollo y campañas bajo el mismo techo. Más de 15 años
            ayudando a marcas a crecer con estrategia, datos y creatividad.
          </p>
        </Container>

        {/* Línea brillante inferior */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#187bef] to-transparent"
        />
      </header>

      <WhyUs />
      <Manifesto />
      <Counters />
      <Process />
      <TeamGrid />
      <PartnersMarquee />
    </>
  );
}
