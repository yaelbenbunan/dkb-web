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
    title: "No ofrecemos soluciones estándar",
    body: "Cuando un cliente nos contrata, nos gusta escucharle, entender qué necesita y diseñar una propuesta a medida. 100% personalizada y con seguimiento cercano hasta lograr el resultado —o hacer todo lo posible para conseguirlo—.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 20l-5-5 5-5M7 15h10a4 4 0 004-4V5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M3 9l3-3 3 3M6 6v9"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0"
        />
        <path
          d="M14 4l5 5-5 5M19 9H9"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: "Largo plazo",
    title: "Pensamos a largo plazo",
    body: "No vendemos resultados de un mes ni atajos que comprometan tu negocio mañana. Cada decisión la tomamos pensando en cómo te ayudará a crecer hoy, pero también dentro de tres años.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M12 7v5l3 2"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
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
              <p className="relative mt-3 text-sm leading-relaxed text-[--color-fg-muted]">
                {p.body}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
