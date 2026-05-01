import { Container } from "@/components/ui/Container";

const PILLARS = [
  {
    label: "Equipo",
    title: "Más que agencia, somos equipo",
    body: "Nos implicamos contigo de verdad. Sin reportes vacíos: trabajamos tu crecimiento como si fuera nuestro, midiendo lo que realmente importa.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path
          d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm14 10v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: "Personalización",
    title: "Soluciones a medida",
    body: "Entendemos qué necesita cada cliente y diseñamos una propuesta 100% personalizada, acompañándole hasta lograr el resultado —o hacer todo lo posible para conseguirlo—.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path
          d="M14 4l5 5-5 5M19 9H9M10 14l-5 5 5 5M5 19h11"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: "Experiencia",
    title: "Nunca partimos de cero",
    body: "Más de 15 años en el sector nos dan aprendizajes y patrones validados. Cada cliente —grande o pequeño— se beneficia de todo lo aprendido en proyectos anteriores.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path
          d="M3 12l2 2 4-4M3 19l2 2 4-4M3 5l2 2 4-4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M13 6h8M13 13h8M13 20h8"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export function WhyUs() {
  return (
    <section className="relative isolate overflow-hidden py-20 md:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-grid-fine opacity-25 fade-edges-y"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 spotlight-accent"
        style={{ ["--sx" as string]: "50%", ["--sy" as string]: "0%" }}
      />

      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[--color-accent]">
            Por qué dinkbit
          </p>
          <h2
            className="mt-6 font-black leading-[1] tracking-tight"
            style={{ fontSize: "var(--text-display-md)" }}
          >
            Tres cosas que nos{" "}
            <span className="italic text-[--color-accent]">definen</span>.
          </h2>
        </div>

        <ul className="mt-16 grid gap-6 md:grid-cols-3">
          {PILLARS.map((p, i) => (
            <li
              key={p.title}
              className="surface surface-hover group relative flex flex-col rounded-3xl p-8 transition-transform duration-300 hover:-translate-y-1.5"
            >
              {/* Número grande de fondo */}
              <span
                aria-hidden
                className="pointer-events-none absolute right-6 top-4 text-7xl font-black leading-none text-white/[0.04] transition-colors group-hover:text-[#187bef]/15"
              >
                0{i + 1}
              </span>

              <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#187bef] to-[#0c5ec4] text-white shadow-[0_8px_24px_-6px_rgba(24,123,239,0.55)]">
                {p.icon}
              </span>

              <p className="relative mt-6 text-[10px] font-bold uppercase tracking-[0.25em] text-[#3a90f2]">
                {p.label}
              </p>
              <h3 className="relative mt-2 text-xl font-bold leading-tight text-[--color-fg]">
                {p.title}
              </h3>
              <p className="relative mt-3 text-base leading-relaxed text-[--color-fg-muted]">
                {p.body}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
