import { Container } from "@/components/ui/Container";
import { WhyUs } from "@/components/nosotros/WhyUs";
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
      <header className="relative isolate overflow-hidden py-28 md:py-36">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 spotlight-accent"
          style={{ ["--sx" as string]: "70%", ["--sy" as string]: "30%" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-50 fade-edges-y"
        />
        <Container>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[--color-accent]">
            Nosotros
          </p>
          <h1
            className="mt-8 max-w-5xl font-black leading-[0.92] tracking-tight"
            style={{ fontSize: "var(--text-display-xl)" }}
          >
            Una agencia digital,{" "}
            <span className="italic text-[--color-accent]">
              hecha para construir.
            </span>
          </h1>
        </Container>
      </header>
      <WhyUs />
      <Counters />
      <TeamGrid />
      <PartnersMarquee />
    </>
  );
}
