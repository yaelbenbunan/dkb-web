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
    <section className="py-24 md:py-32">
      <Container className="grid gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[--color-accent]">
            Por qué dinkbit
          </p>
          <h2 className="mt-4 text-3xl font-bold leading-[1.1] tracking-tight md:text-4xl">
            Lo que hacemos importa, pero{" "}
            <span className="text-[--color-accent]">cómo lo hacemos</span> marca
            la diferencia.
          </h2>

          <ul className="mt-10 space-y-8">
            {KPIS.map((k) => (
              <li key={k.title} className="border-l-2 border-[--color-accent] pl-6">
                <p className="text-lg font-semibold text-[--color-fg]">{k.title}</p>
                <p className="mt-2 text-[--color-fg-muted]">{k.body}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-[--color-border] bg-[--color-bg-elevated] sm:aspect-[5/6] lg:aspect-auto lg:min-h-[600px]">
          <Image
            src="/img/nosotros/mosaico-oficina.png"
            alt="Equipo dinkbit en la oficina"
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      </Container>
    </section>
  );
}
