import { Container } from "@/components/ui/Container";
import { WhyUs } from "@/components/nosotros/WhyUs";
import { Manifesto } from "@/components/nosotros/Manifesto";
import { HeaderStats } from "@/components/nosotros/HeaderStats";
import { TeamGrid } from "@/components/nosotros/TeamGrid";

export const metadata = {
  title: "Nosotros — dinkbit",
  description:
    "Equipo multidisciplinar con 15+ años de experiencia. Diseño, desarrollo, paid media y SEO bajo el mismo techo.",
};

export default function NosotrosPage() {
  return (
    <>
      <header className="relative isolate overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 60% 70% at 25% 30%, rgba(58,144,242,0.28), transparent 65%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-25 fade-edges-y"
        />

        <Container className="relative py-24 md:py-28">
          <p className="inline-flex items-center gap-2 rounded-full bg-[#187bef]/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.25em] text-[#3a90f2] ring-1 ring-[#187bef]/30">
            <span className="relative inline-flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[#3a90f2] animate-ping-soft" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#3a90f2]" />
            </span>
            Nosotros
          </p>
          <h1
            className="mt-8 max-w-5xl font-black leading-[0.95] tracking-tight"
            style={{ fontSize: "var(--text-display-xl)" }}
          >
            Una agencia digital,
            <br />
            <span className="italic text-[#3a90f2]">hecha para construir.</span>
          </h1>

          <HeaderStats />
        </Container>

        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#187bef] to-transparent"
        />
      </header>

      <WhyUs />
      <TeamGrid />
      <Manifesto />
    </>
  );
}
