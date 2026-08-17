import type { Metadata } from "next";
import { Fragment } from "react";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { GROWTH } from "@/lib/growth-config";
import { CalculadoraWizard } from "./_components/CalculadoraWizard";

// El layout raíz ya añade " — dinkbit" vía su title template
// (src/app/layout.tsx), así que aquí NO se repite el sufijo. El openGraph.title
// sí necesita la marca explícita: esa plantilla no le aplica.
export const metadata: Metadata = {
  title: "¿Sabes cuánto te cuesta conseguir un paciente?",
  description:
    "Conecta tus campañas, tu web y tu CRM y descubre qué canales te traen pacientes y cuáles solo leads. Desde 199 €/mes, sin permanencia.",
  alternates: { canonical: GROWTH.path },
  openGraph: {
    type: "website",
    url: GROWTH.path,
    title: "¿Sabes cuánto te cuesta conseguir un paciente? — dinkbit",
    description:
      "El sistema que mide de la campaña al paciente. Desde 199 €/mes, sin permanencia.",
    siteName: "dinkbit",
  },
};

// Eyebrow reutilizado en varias secciones: mismo patrón que KitDigitalSection.
const eyebrowClass =
  "text-xs font-semibold uppercase tracking-[0.25em] text-accent";
const h2Class =
  "mt-6 text-3xl font-black leading-tight tracking-tight md:text-5xl";

// El circuito que crea la necesidad: lo que entra y lo que sale se conocen,
// lo del medio no. `gap: true` marca el nodo (y las flechas que lo tocan) que
// representa el agujero negro.
const FUNNEL_STEPS: { label: string; gap?: boolean }[] = [
  { label: "Anuncio" },
  { label: "Web" },
  { label: "Formulario" },
  { label: "???", gap: true },
  { label: "Paciente" },
  { label: "Facturación" },
];

// Cifras de muestra, creíbles para una clínica pequeña (no una multinacional):
// 1.200 €/mes, 34 leads, 9 pacientes que acudieron, ticket medio de 600 €.
const STATS = [
  { label: "Invertido en publicidad", value: "1.200 €" },
  { label: "Leads recibidos", value: "34" },
  { label: "Pacientes que acudieron", value: "9" },
  { label: "Generado en consulta", value: "5.400 €" },
];

const LAYERS = [
  {
    n: "01",
    title: "Captación",
    desc: "Cada campaña y cada anuncio quedan identificados, no solo el canal.",
  },
  {
    n: "02",
    title: "Conversión",
    desc: "La web y el formulario se miden hasta el envío: qué entra, y desde dónde.",
  },
  {
    n: "03",
    title: "Gestión",
    desc: "El CRM conecta cada lead con lo que pasó después: cita, paciente, alta.",
  },
  {
    n: "04",
    title: "Inteligencia",
    desc: "Todo junto: qué canal trae pacientes que pagan, no solo leads baratos.",
  },
];

export default function GrowthPage() {
  return (
    <>
      {/* 1. Hero: abrir con el problema, nunca con el precio. */}
      <header className="relative isolate overflow-hidden py-20 md:py-28">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 spotlight-accent"
          style={{ ["--sx" as string]: "50%", ["--sy" as string]: "10%" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-40 fade-edges-y"
        />
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <p className={eyebrowClass}>Para clínicas que ya invierten en publicidad</p>
            <h1
              className="mt-5 text-balance font-black leading-[1.02] tracking-tight text-fg"
              style={{ fontSize: "var(--text-display-lg)" }}
            >
              ¿Sabes cuánto te cuesta conseguir un paciente nuevo?
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-fg-muted">
              Sabes cuánto inviertes. Sabes cuántos formularios recibes. Pero ¿sabes
              cuántos acabaron sentados en tu clínica, y cuánto dinero generaron?
            </p>
            <div className="mt-9">
              <a
                href="#calculadora"
                className="inline-flex h-12 items-center justify-center rounded-lg bg-accent px-7 text-base font-semibold text-white shadow-[0_8px_24px_-6px_rgba(24,123,239,0.6)] transition-all hover:-translate-y-0.5 hover:bg-accent-hover"
              >
                Calcúlalo gratis
              </a>
            </div>
          </div>
        </Container>
      </header>

      {/* 2. El agujero negro: la sección que crea la necesidad. Se resuelve con
          el propio diagrama, no con un párrafo que lo explique. */}
      <section className="relative isolate overflow-hidden py-24 md:py-32">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-grid-fine opacity-30 fade-edges-y"
        />
        <Container>
          <Reveal>
            <div className="mx-auto max-w-3xl text-center">
              <p className={eyebrowClass}>El punto ciego</p>
              <h2 className={h2Class}>Entre el anuncio y la caja no hay nadie mirando</h2>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-fg-muted">
                Da igual que ya trabajes con una agencia: si no ves el circuito
                entero, tampoco sabe ella qué canal te trae pacientes y cuál solo
                te trae leads.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="mt-16 flex flex-col flex-wrap items-center justify-center gap-3 sm:flex-row sm:gap-2.5">
              {FUNNEL_STEPS.map((step, i) => (
                <Fragment key={step.label}>
                  {i > 0 && (
                    <FunnelArrow warning={step.gap || FUNNEL_STEPS[i - 1]?.gap} />
                  )}
                  <FunnelNode label={step.label} gap={step.gap} />
                </Fragment>
              ))}
            </div>
          </Reveal>
        </Container>
      </section>

      {/* 3. Vídeo: solo si hay fuente. Hoy GROWTH.videoSrc es null, así que
          esto no imprime ni sección ni borde: la landing sale sin vídeo. */}
      {GROWTH.videoSrc && (
        <section className="py-16 md:py-20">
          <Container size="narrow">
            <Reveal>
              <video
                src={GROWTH.videoSrc}
                controls
                playsInline
                className="w-full rounded-2xl"
              />
            </Reveal>
          </Container>
        </section>
      )}

      {/* 4. Qué verías: cifras de muestra, etiquetadas como ejemplo de forma
          visible (no en letra pequeña) para que no se confundan con datos
          reales de nadie. */}
      <section className="py-16 md:py-24">
        <Container>
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-accent ring-1 ring-accent/30">
                Ejemplo, no tus datos
              </span>
              <h2 className={h2Class}>Esto es lo que verías cada mes</h2>
              <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-fg-muted">
                Con las cifras de una clínica pequeña, a modo de ejemplo. Las
                tuyas las ves en la calculadora, más abajo.
              </p>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((s, i) => (
              <Reveal key={s.label} delay={Math.min(i, 4) * 0.07}>
                <div className="surface h-full rounded-2xl p-6 text-center">
                  <p className="text-3xl font-black text-accent">{s.value}</p>
                  <p className="mt-2 text-sm leading-relaxed text-fg-muted">{s.label}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.2}>
            <p className="mx-auto mt-8 max-w-xl text-center text-base text-fg-muted">
              Por cada euro invertido, esta clínica recupera{" "}
              <strong className="text-fg">4,50 €</strong>. Es el dato que hoy no
              se ve en ningún sitio.
            </p>
          </Reveal>
        </Container>
      </section>

      {/* 5. Cómo funciona: las cuatro capas, una línea cada una. */}
      <section className="py-16 md:py-24">
        <Container>
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <p className={eyebrowClass}>Cómo funciona</p>
              <h2 className={h2Class}>Captación, conversión, gestión e inteligencia</h2>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {LAYERS.map((l, i) => (
              <Reveal key={l.n} delay={Math.min(i, 4) * 0.07}>
                <div className="surface h-full rounded-2xl p-6">
                  <p className="text-3xl font-black text-accent/30">{l.n}</p>
                  <p className="mt-3 text-base font-bold text-fg">{l.title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{l.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* 6. La oferta: las tres cosas, sin suavizar la cuota de alta. Publicar
          solo el "desde 199 €" y soltar el alta en la llamada rompe la
          confianza justo cuando toca cerrar, que es lo que este producto
          vende. Sin importe: la cuota depende de la inversión publicitaria
          de cada clínica. */}
      <section className="py-16 md:py-24">
        <Container size="narrow">
          <Reveal>
            <div className="surface-elevated rounded-3xl p-8 text-center sm:p-10">
              <h2 className="text-3xl font-black leading-tight tracking-tight text-[#0c1c40] md:text-4xl">
                Desde 199 €/mes, sin permanencia
              </h2>
              <ul className="mx-auto mt-8 max-w-md space-y-4 text-left">
                <li className="flex items-start gap-3">
                  <CheckIcon />
                  <span className="text-base leading-relaxed text-slate-700">
                    <strong className="text-[#0c1c40]">Desde 199 €/mes</strong>, según
                    el tamaño de tu clínica y lo que quieras medir.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckIcon />
                  <span className="text-base leading-relaxed text-slate-700">
                    <strong className="text-[#0c1c40]">Sin permanencia.</strong> Te
                    quedas por los resultados, no por el contrato.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckIcon />
                  <span className="text-base leading-relaxed text-slate-700">
                    <strong className="text-[#0c1c40]">
                      Hay una cuota de alta
                    </strong>{" "}
                    para dejar todo conectado (campañas, web, CRM), que depende
                    de tu inversión publicitaria. Te la calculamos con tus datos.
                  </span>
                </li>
              </ul>
              <a
                href="#calculadora"
                className="mt-9 inline-flex h-12 items-center justify-center rounded-lg bg-accent px-7 text-base font-semibold text-white shadow-[0_8px_24px_-6px_rgba(24,123,239,0.6)] transition-all hover:-translate-y-0.5 hover:bg-accent-hover"
              >
                Calcúlalo gratis
              </a>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* 7. Calculadora. */}
      <section id="calculadora" className="scroll-mt-24 py-16 md:py-24">
        <Container>
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <p className={eyebrowClass}>Tu número, no el de una clínica de ejemplo</p>
              <h2 className={h2Class}>Calcula tu coste por paciente</h2>
            </div>
          </Reveal>
          <Reveal delay={0.1} className="mt-12">
            <CalculadoraWizard />
          </Reveal>
        </Container>
      </section>

      {/* 8. Cierre. */}
      <section className="py-16 md:py-24">
        <Container size="narrow">
          <Reveal>
            <p className="text-balance text-center text-2xl font-bold leading-snug tracking-tight text-fg md:text-3xl">
              Vas a querer quedarte por los resultados, no porque te obliguemos.
            </p>
          </Reveal>
        </Container>
      </section>
    </>
  );
}

function FunnelArrow({ warning }: { warning?: boolean }) {
  return (
    <span
      aria-hidden
      className={`text-2xl font-black leading-none ${warning ? "text-red-400" : "text-fg-dim"}`}
    >
      {/* En columna (móvil) la flecha apunta hacia abajo; en fila, a la derecha. */}
      <span className="block sm:hidden">↓</span>
      <span className="hidden sm:block">→</span>
    </span>
  );
}

function FunnelNode({ label, gap }: { label: string; gap?: boolean }) {
  if (gap) {
    // "???" no dice nada a un lector de pantalla; se agrupa el nodo entero
    // bajo un único aria-label que explica el hueco, y se oculta el resto
    // (que es solo refuerzo visual) para no duplicar el anuncio.
    return (
      <div
        role="img"
        aria-label="Aquí no hay medición: nadie sabe qué pasa entre el formulario y el paciente"
        className="flex flex-col items-center gap-2"
      >
        <div
          aria-hidden
          className="flex h-16 w-24 animate-pulse items-center justify-center rounded-xl border-2 border-dashed border-red-400/70 bg-red-500/10 text-xl font-black text-red-400"
        >
          {label}
        </div>
        <span
          aria-hidden
          className="text-[11px] font-bold uppercase tracking-wide text-red-400/90"
        >
          Nadie mira aquí
        </span>
      </div>
    );
  }
  return (
    <div className="surface flex h-16 min-w-[6.5rem] items-center justify-center rounded-xl px-4 text-center text-sm font-bold text-fg">
      {label}
    </div>
  );
}

function CheckIcon() {
  return (
    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent-hover">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M3.5 8.5l3 3 6-7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
