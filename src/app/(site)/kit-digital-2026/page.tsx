import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { KitDigital2026Form } from "./KitDigital2026Form";

export const metadata: Metadata = {
  title: "El Kit Digital vuelve en 2026 — dinkbit",
  description:
    "El Kit Digital se reactiva en 2026: se reabren los fondos para digitalizar tu negocio (web, SEO, redes sociales, equipos). Apúntate y te avisamos en cuanto se abra el plazo. Preparamos tu diagnóstico y tramitamos tu solicitud.",
  alternates: { canonical: "/kit-digital-2026" },
  openGraph: {
    type: "website",
    url: "/kit-digital-2026",
    title: "El Kit Digital vuelve en 2026 — dinkbit",
    description:
      "Se reactivan los fondos del Kit Digital. Apúntate y te avisamos en cuanto se abra el plazo: preparamos tu diagnóstico y tramitamos tu solicitud.",
    siteName: "dinkbit",
  },
};

const COVERS = [
  {
    t: "Página web",
    d: "Tu web profesional o tienda online, lista para captar clientes.",
    icon: (
      <path d="M2 5h10M2 5a1 1 0 011-1h8a1 1 0 011 1M2 5v4a1 1 0 001 1h8a1 1 0 001-1V5M5.5 8h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    t: "SEO / posicionamiento",
    d: "Aparece en Google cuando tus clientes te buscan.",
    icon: (
      <path d="M6.5 10a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM9 9l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    t: "Redes sociales",
    d: "Gestión de tus perfiles para conectar con tu audiencia.",
    icon: (
      <path d="M5 7a2 2 0 100-4 2 2 0 000 4zM10 12a2 2 0 100-4 2 2 0 000 4zM10 4a2 2 0 100-.01M6.7 6.3l2.6 1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    t: "Puesto de trabajo",
    d: "Renueva tu ordenador y trabaja con equipos a la altura.",
    icon: (
      <path d="M2.5 3.5h9v6h-9v-6zM4 11.5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
];

const STEPS = [
  { n: "01", t: "Apúntate", d: "Déjanos tus datos y qué te interesa. Te sumamos a la lista." },
  { n: "02", t: "Preparamos tu diagnóstico", d: "Adelantamos el diagnóstico de madurez digital para que estés listo el día 1." },
  { n: "03", t: "Tramitamos tu solicitud", d: "En cuanto se abra el plazo, gestionamos toda la solicitud del bono por ti." },
  { n: "04", t: "Lo implementamos", d: "Ponemos en marcha las soluciones digitales que elijas." },
];

export default function KitDigital2026Page() {
  return (
    <>
      {/* Hero + formulario */}
      <header className="relative isolate overflow-hidden py-16 md:py-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 spotlight-accent"
          style={{ ["--sx" as string]: "78%", ["--sy" as string]: "22%" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-40 fade-edges-y"
        />
        <Container>
          <div className="grid items-start gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="lg:pt-6">
              <p className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-accent ring-1 ring-accent/30">
                Kit Digital 2026
              </p>
              <h1
                className="mt-6 font-black leading-[1.02] tracking-tight"
                style={{ fontSize: "var(--text-display-lg)" }}
              >
                El Kit Digital{" "}
                <span className="text-accent">vuelve en 2026.</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-fg-muted">
                Se reactivan los fondos para digitalizar tu negocio: web, SEO,
                redes sociales y equipos. Apúntate ahora y{" "}
                <strong className="text-fg">te avisamos en cuanto se abra el plazo</strong>
                . Preparamos tu diagnóstico y tramitamos tu solicitud, sin que
                tengas que pelearte con el papeleo.
              </p>

              <ul className="mt-8 space-y-3">
                {[
                  "Nos ocupamos de toda la tramitación del bono.",
                  "Preparamos tu diagnóstico de madurez digital.",
                  "Te avisamos el día que se abra el plazo. Sin compromiso.",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3 text-fg">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent-hover">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M3 7.5L6 10.5L11 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span className="text-[15px] leading-relaxed">{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Reveal from="right" className="lg:justify-self-end lg:sticky lg:top-24">
              <div id="apuntarme" className="scroll-mt-24">
                <KitDigital2026Form />
              </div>
            </Reveal>
          </div>
        </Container>
      </header>

      {/* Qué cubre */}
      <Container className="py-14 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
            Qué puedes digitalizar
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
            El bono cubre lo que tu negocio necesita
          </h2>
          <p className="mt-3 text-fg-muted">
            Elige una o varias soluciones digitales. Nosotros te asesoramos para
            aprovechar al máximo la ayuda.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {COVERS.map((c, i) => (
            <Reveal key={c.t} delay={Math.min(i, 4) * 0.07}>
              <div className="surface h-full rounded-2xl p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/15 text-accent-hover">
                  <svg width="20" height="20" viewBox="0 0 14 14" fill="none">
                    {c.icon}
                  </svg>
                </span>
                <p className="mt-4 text-base font-bold text-fg">{c.t}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{c.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>

      {/* Cómo funciona */}
      <Container className="py-8 md:py-12">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
            Cómo funciona
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
            Tú te apuntas, nosotros nos encargamos
          </h2>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={Math.min(i, 4) * 0.07}>
              <div className="surface h-full rounded-2xl p-6">
                <p className="text-3xl font-black text-accent/30">{s.n}</p>
                <p className="mt-3 text-base font-bold text-fg">{s.t}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{s.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>

      {/* CTA final */}
      <Container className="py-14 md:py-20">
        <Reveal>
          <div className="surface-elevated relative overflow-hidden rounded-3xl px-8 py-12 text-center md:px-12">
            <h2 className="text-2xl font-bold tracking-tight text-[#0c1c40] md:text-3xl">
              No te quedes fuera cuando se abra el plazo
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-700">
              Los fondos se conceden hasta agotarse. Apuntarte ahora te pone en
              cabeza el día que arranque.
            </p>
            <a
              href="#apuntarme"
              className="mt-7 inline-flex h-12 items-center gap-2 rounded-lg bg-accent px-7 text-base font-semibold text-white shadow-[0_8px_24px_-6px_rgba(24,123,239,0.6)] transition-all hover:-translate-y-0.5 hover:bg-accent-hover"
            >
              Apúntame a la lista
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
                <path d="M3 7h8m0 0L7 3m4 4l-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
        </Reveal>
      </Container>

      {/* Nota legal honesta */}
      <Container className="pb-16">
        <p className="mx-auto max-w-3xl text-center text-xs leading-relaxed text-fg-muted">
          El programa Kit Digital cerró su plazo general en octubre de 2025. La
          Orden TDF/39/2026 reactiva los fondos remanentes y elimina la fecha de
          cierre fija (se conceden hasta agotar los fondos). La apertura de una
          nueva ventana de solicitud está pendiente de las instrucciones
          oficiales de Red.es / Acelera pyme: al apuntarte te avisamos en cuanto
          se confirme y preparamos tu diagnóstico para que llegues a tiempo. Los
          importes y categorías definitivos serán los que publique la
          convocatoria oficial.
        </p>
      </Container>
    </>
  );
}
