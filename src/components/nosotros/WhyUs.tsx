import Image from "next/image";
import { Container } from "@/components/ui/Container";

const KPIS = [
  {
    title: "Aparece cuando tu cliente te necesita",
    body: "Estudiamos tu negocio y a quién te diriges para que tu web aparezca cuando te buscan, ofrezca lo que necesitan y convierta las visitas en oportunidades.",
  },
  {
    title: "Construimos marca y contenido que conecta",
    body: "Humanizamos tu negocio para que los algoritmos te reconozcan como una referencia real en tu sector.",
  },
  {
    title: "Más que agencia, somos equipo",
    body: "Nos implicamos contigo de verdad. Sin reportes vacíos: trabajamos tu crecimiento como si fuera nuestro, midiendo lo que realmente importa.",
  },
];

export function WhyUs() {
  return (
    <section className="relative isolate overflow-hidden py-28 md:py-36">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-grid-fine opacity-30 fade-edges-y"
      />
      <Container className="grid gap-16 lg:grid-cols-2 lg:gap-20">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[--color-accent]">
            Por qué dinkbit
          </p>
          <h2
            className="mt-6 font-black leading-[0.95] tracking-tight"
            style={{ fontSize: "var(--text-display-md)" }}
          >
            Lo que hacemos importa, pero{" "}
            <span className="italic text-[--color-accent]">cómo lo hacemos</span>{" "}
            marca la diferencia.
          </h2>

          <ul className="mt-12 space-y-10">
            {KPIS.map((k, i) => (
              <li key={k.title} className="relative pl-12">
                <span className="absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-[--color-accent-soft] font-bold text-[--color-accent]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="text-xl font-bold text-[--color-fg]">{k.title}</p>
                <p className="mt-2 text-[--color-fg-muted]">{k.body}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-[--color-bg-elevated] sm:aspect-[5/6] lg:aspect-auto lg:min-h-[600px]">
          <Image
            src="/img/nosotros/mosaico-oficina.png"
            alt="Equipo dinkbit en la oficina"
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-[--color-bg-deep]/60 via-transparent to-[--color-accent]/10"
          />
        </div>
      </Container>
    </section>
  );
}
