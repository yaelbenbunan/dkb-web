import Image from "next/image";
import { Container } from "@/components/ui/Container";

const KPIS = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
        <path d="M16 16l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
    title: "Aparece cuando tu cliente te necesita",
    body: "Estudiamos tu negocio y a quién te diriges para que tu web aparezca cuando te buscan, ofrezca lo que necesitan y convierta las visitas en oportunidades.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2v8M12 14v8M2 12h8M14 12h8M5 5l4 4M15 15l4 4M19 5l-4 4M9 15l-4 4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
    title: "Construimos marca y contenido que conecta",
    body: "Humanizamos tu negocio para que los algoritmos te reconozcan como una referencia real en tu sector.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm14 10v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    title: "Más que agencia, somos equipo",
    body: "Nos implicamos contigo de verdad. Sin reportes vacíos: trabajamos tu crecimiento como si fuera nuestro, midiendo lo que realmente importa.",
  },
];

export function WhyUs() {
  return (
    <section className="relative isolate overflow-hidden py-20 md:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-grid-fine opacity-25 fade-edges-y"
      />
      <Container className="grid gap-16 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
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

          <ul className="mt-12 space-y-5">
            {KPIS.map((k) => (
              <li
                key={k.title}
                className="surface surface-hover group flex gap-5 rounded-2xl p-5 transition-transform duration-300 hover:-translate-y-0.5"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#187bef] to-[#0c5ec4] text-white shadow-[0_8px_20px_-6px_rgba(24,123,239,0.5)]">
                  {k.icon}
                </span>
                <div>
                  <p className="text-base font-bold text-[--color-fg]">{k.title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-[--color-fg-muted]">
                    {k.body}
                  </p>
                </div>
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
          {/* Borde superior brillante */}
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#187bef]/60 to-transparent"
          />
          {/* Vignette para enfocar el contenido */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-[--color-bg-deep]/65 via-transparent to-[--color-accent]/10"
          />
          {/* Etiqueta flotante decorativa */}
          <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between gap-4">
            <span className="inline-flex h-7 items-center rounded-full bg-white/10 px-3 text-[10px] font-bold uppercase tracking-[0.22em] text-white backdrop-blur ring-1 ring-white/20">
              San Sebastián de los Reyes · Madrid
            </span>
          </div>
        </div>
      </Container>
    </section>
  );
}
