import type { Metadata } from "next";
import { GROWTH, GROWTH_THEME as T } from "@/lib/growth-config";
import { CalculadoraWizard } from "./_components/CalculadoraWizard";
import { LineaDeTiempo } from "./_components/LineaDeTiempo";

export const metadata: Metadata = {
  title: "Llenar tu agenda es fácil. Ganar más, no",
  description:
    "Puedes tener la agenda llena y estar perdiendo dinero. Llevamos tus campañas con un único objetivo: que tu clínica gane más. Desde 199 €/mes, sin permanencia.",
  alternates: { canonical: GROWTH.path },
  openGraph: {
    type: "website",
    url: GROWTH.path,
    title: "Llenar tu agenda es fácil. Ganar más, no — dinkbit",
    description:
      "Puedes tener la agenda llena y estar perdiendo dinero. Te decimos qué pacientes te salen a cuenta.",
    siteName: "dinkbit",
  },
};

/** Ancho máximo propio: no usamos el Container del sitio para no heredar su
 *  escala, que está pensada para páginas corporativas y aquí se queda corta. */
function Wrap({
  children,
  narrow = false,
  className = "",
}: {
  children: React.ReactNode;
  narrow?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`mx-auto w-full px-6 md:px-10 ${narrow ? "max-w-3xl" : "max-w-6xl"} ${className}`}
    >
      {children}
    </div>
  );
}

/** Etiqueta pequeña en mayúsculas que abre cada sección. */
function Eyebrow({ children, color = T.lime }: { children: React.ReactNode; color?: string }) {
  return (
    <p className="text-xs font-bold uppercase tracking-[0.28em]" style={{ color }}>
      {children}
    </p>
  );
}

/**
 * Las dos clínicas del bloque del problema.
 *
 * Es la pieza que sostiene todo el argumento: la de arriba trabaja el doble y
 * se lleva un tercio. Va en cifras grandes y no en prosa porque el dueño de una
 * clínica reconoce su propia situación en un número antes que en un párrafo.
 */
const COMPARATIVA = [
  {
    titulo: "La que llena la agenda",
    color: T.red,
    pacientes: "40",
    gasto: "4.000 €",
    queda: "1.100 €",
    remate: "Trabaja a tope. Y cobra por trabajar, no por ganar.",
  },
  {
    titulo: "La que mira los números",
    color: T.lime,
    pacientes: "22",
    gasto: "900 €",
    queda: "3.400 €",
    remate: "La mitad de pacientes. El triple de beneficio.",
  },
];

/** Los cuatro pasos del sistema, en orden cronológico real. */
const PASOS = [
  {
    n: "01",
    t: "Traemos pacientes",
    d: "Campañas en Google y Meta. Esto lo hace cualquiera, y es la parte fácil.",
  },
  {
    n: "02",
    t: "Nada se pierde por el camino",
    d: "Cada lead entra en un sistema ordenado, con su ficha y su origen. Ni uno se queda en un WhatsApp sin contestar.",
  },
  {
    n: "03",
    t: "Sabemos quién vino de verdad",
    d: "Cuando el paciente pasa por consulta se marcan dos cosas: si vino y cuánto facturó. Dos toques y ya está.",
  },
  {
    n: "04",
    t: "Decidimos con datos, y tú lo ves",
    d: "Nosotros llevamos las campañas: qué subir, qué apagar y dónde poner el dinero. Tú entras al panel cuando quieras.",
  },
];

function FilaEmbudo({
  etiqueta,
  valor,
  ancho,
  nota,
}: {
  etiqueta: string;
  valor: string;
  ancho: number;
  nota?: string;
}) {
  return (
    <div className="py-3.5" style={{ borderBottom: `1px solid ${T.line}` }}>
      <div className="flex items-baseline justify-between gap-4">
        <span
          className="text-xs font-bold uppercase tracking-[0.2em]"
          style={{ color: T.muted }}
        >
          {etiqueta}
        </span>
        <span className="text-2xl font-black tabular-nums" style={{ color: T.fg }}>
          {valor}
        </span>
      </div>
      <div
        className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full"
        style={{ background: T.line }}
        aria-hidden
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${ancho}%`, background: T.lime, opacity: 0.55 }}
        />
      </div>
      {nota && (
        <p className="mt-2 text-xs" style={{ color: T.muted }}>
          {nota}
        </p>
      )}
    </div>
  );
}

/** El panel de resultados, que acompaña a los pasos en pegajoso: lo que esos
 *  cuatro pasos producen, a la vista mientras se leen. */
function PanelEmbudo() {
  return (
    <div
      className="rounded-3xl p-6 md:p-7"
      style={{ background: T.surface, border: `1px solid ${T.line}` }}
    >
      <div className="flex items-center justify-between">
        <span
          className="rounded-full px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.2em]"
          style={{ background: T.line, color: T.muted }}
        >
          Ejemplo, no tus datos
        </span>
        <span className="text-xs" style={{ color: T.muted }}>
          Marzo
        </span>
      </div>

      <div className="mt-5">
        <FilaEmbudo etiqueta="Inviertes" valor="1.200 €" ancho={100} />
        <FilaEmbudo etiqueta="Leads" valor="34" ancho={100} />
        <FilaEmbudo etiqueta="Piden cita" valor="18" ancho={53} />
        <FilaEmbudo
          etiqueta="Acuden de verdad"
          valor="11"
          ancho={32}
          nota="Aquí se cae todo el mundo, y aquí es donde nadie mira."
        />
      </div>

      <div className="mt-6 rounded-2xl p-5" style={{ background: T.lime }}>
        <p
          className="text-[0.65rem] font-bold uppercase tracking-[0.24em]"
          style={{ color: T.ink, opacity: 0.7 }}
        >
          Te han facturado
        </p>
        <p
          className="mt-1 font-black leading-none tabular-nums"
          style={{ fontSize: "clamp(2.25rem, 6vw, 3.25rem)", color: T.ink }}
        >
          5.400 €
        </p>
        <p className="mt-2 text-sm font-bold" style={{ color: T.ink }}>
          Por cada euro invertido, has recuperado 4,50 €.
        </p>
      </div>
    </div>
  );
}

export default function GrowthPage() {
  return (
    <>
      {/* ───────── 1. Hero ───────── */}
      <header className="relative overflow-hidden pb-20 pt-24 md:pb-28 md:pt-32">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full blur-[120px]"
          style={{ background: T.lime, opacity: 0.1 }}
        />
        <Wrap className="relative">
          <Eyebrow>Para clínicas que ya invierten en publicidad</Eyebrow>

          <h1
            className="mt-8 font-black leading-[0.92] tracking-[-0.03em]"
            style={{ fontSize: "clamp(2.75rem, 8.5vw, 6.5rem)" }}
          >
            Llenar tu agenda
            <br />
            es fácil.
            <br />
            <span style={{ color: T.lime }}>Ganar más, no.</span>
          </h1>

          <p
            className="mt-10 max-w-2xl leading-relaxed"
            style={{ fontSize: "clamp(1.125rem, 2.2vw, 1.5rem)", color: T.muted }}
          >
            Cualquiera te trae pacientes. Nosotros te decimos{" "}
            <strong style={{ color: T.fg, fontWeight: 700 }}>
              cuáles te dejan dinero y cuáles te lo quitan
            </strong>
            , para que tomes mejores decisiones.
          </p>

          <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center">
            <a
              href="#calculadora"
              className="inline-flex h-14 items-center justify-center rounded-full px-9 text-base font-bold transition-transform hover:-translate-y-0.5"
              style={{ background: T.lime, color: T.ink }}
            >
              Calcula qué te cuesta un paciente
            </a>
            <span className="text-sm" style={{ color: T.muted }}>
              Gratis y en 1 minuto
            </span>
          </div>
        </Wrap>
      </header>

      {/* ───────── 2. El problema ───────── */}
      <section className="py-20 md:py-28" style={{ background: T.surface }}>
        <Wrap>
          <Eyebrow color={T.red}>El problema</Eyebrow>

          <h2
            className="mt-8 max-w-4xl font-black leading-[1.05] tracking-[-0.02em] text-balance"
            style={{ fontSize: "clamp(2rem, 5.5vw, 4rem)" }}
          >
            Puedes tener la agenda llena y{" "}
            <span style={{ color: T.red }}>estar perdiendo dinero</span>.
          </h2>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed" style={{ color: T.muted }}>
            Dos clínicas del mismo tamaño, el mismo mes:
          </p>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {COMPARATIVA.map((c) => (
              <div
                key={c.titulo}
                className="rounded-3xl p-7 md:p-9"
                style={{ background: T.ink, border: `1px solid ${c.color}44` }}
              >
                <p
                  className="text-xs font-bold uppercase tracking-[0.2em]"
                  style={{ color: c.color }}
                >
                  {c.titulo}
                </p>

                <div className="mt-7 space-y-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm" style={{ color: T.muted }}>
                      Pacientes nuevos
                    </span>
                    <span className="text-3xl font-black tabular-nums">{c.pacientes}</span>
                  </div>
                  <div
                    className="flex items-baseline justify-between gap-3"
                    style={{ borderTop: `1px solid ${T.line}`, paddingTop: "1.25rem" }}
                  >
                    <span className="text-sm" style={{ color: T.muted }}>
                      Se gasta en traerlos
                    </span>
                    <span className="text-3xl font-black tabular-nums">{c.gasto}</span>
                  </div>
                  <div
                    className="flex items-baseline justify-between gap-3"
                    style={{ borderTop: `1px solid ${T.line}`, paddingTop: "1.25rem" }}
                  >
                    <span className="text-sm font-bold" style={{ color: T.fg }}>
                      Le queda
                    </span>
                    <span
                      className="font-black leading-none tabular-nums"
                      style={{ fontSize: "clamp(2.25rem, 7vw, 3.25rem)", color: c.color }}
                    >
                      {c.queda}
                    </span>
                  </div>
                </div>

                <p className="mt-7 text-base font-bold leading-snug">{c.remate}</p>
              </div>
            ))}
          </div>
        </Wrap>
      </section>

      {/* ───────── 3. La bisagra: la frase, a pantalla completa ───────── */}
      <section className="flex min-h-[100svh] items-center py-24">
        <Wrap>
          <p
            className="font-black leading-[0.95] tracking-[-0.03em] text-balance"
            style={{ fontSize: "clamp(2.5rem, 9vw, 7rem)" }}
          >
            El objetivo no es
            <br />
            llenarte la agenda.
            <br />
            <span style={{ color: T.lime }}>Es que ganes más.</span>
          </p>
        </Wrap>
      </section>

      {/* ───────── 4. Cómo funciona: los pasos y lo que producen ───────── */}
      <section className="py-20 md:py-28" style={{ background: T.surface }}>
        <Wrap>
          <Eyebrow>Cómo funciona</Eyebrow>

          <h2
            className="mt-8 max-w-3xl font-black leading-[1.05] tracking-[-0.02em] text-balance"
            style={{ fontSize: "clamp(2rem, 5.5vw, 3.5rem)" }}
          >
            Seguimos al paciente desde el anuncio{" "}
            <span style={{ color: T.lime }}>hasta la caja</span>.
          </h2>

          {/* Los pasos a la izquierda y lo que producen a la derecha, en
              pegajoso: mientras se leen los cuatro pasos, el panel que sale de
              ellos permanece a la vista. Eso conecta proceso y resultado sin
              tener que explicarlo con un párrafo. */}
          <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-16">
            <LineaDeTiempo pasos={PASOS} />

            <div className="lg:sticky lg:top-12 lg:self-start lg:pt-14">
              <PanelEmbudo />
              <p className="mt-4 text-sm leading-relaxed" style={{ color: T.muted }}>
                Y desglosado por campaña, para saber cuál sube y cuál se apaga.
              </p>
            </div>
          </div>

          <div
            className="mt-16 rounded-3xl p-8 md:p-10"
            style={{ background: T.ink, border: `1px solid ${T.line}` }}
          >
            <p
              className="font-black leading-snug text-balance"
              style={{ fontSize: "clamp(1.25rem, 3vw, 1.875rem)" }}
            >
              Somos tu agencia, no un programa que te dejamos y te apañas.
            </p>
            <p className="mt-4 max-w-2xl leading-relaxed" style={{ color: T.muted }}>
              Montamos la web, llevamos las campañas y tomamos las decisiones, con un único
              objetivo:{" "}
              <strong style={{ color: T.lime, fontWeight: 700 }}>que tu clínica gane más</strong>
              . Lo que te damos a ti es la transparencia para comprobarlo cuando quieras.
            </p>
          </div>
        </Wrap>
      </section>

      {/* ───────── 5. La calculadora ───────── */}
      <section id="calculadora" className="scroll-mt-8 py-20 md:py-28">
        <Wrap narrow>
          <Eyebrow>Empieza por aquí</Eyebrow>

          <h2
            className="mt-8 font-black leading-[1.05] tracking-[-0.02em] text-balance"
            style={{ fontSize: "clamp(2rem, 5.5vw, 3.5rem)" }}
          >
            ¿Cuánto te cuesta hoy conseguir un paciente?
          </h2>

          <p className="mt-6 text-lg leading-relaxed" style={{ color: T.muted }}>
            Tres preguntas. Si no sabes las respuestas, también nos vale — de hecho, eso ya es
            el diagnóstico.
          </p>

          <div className="mt-10">
            <CalculadoraWizard />
          </div>
        </Wrap>
      </section>

      {/* ───────── 6. Oferta y cierre ───────── */}
      <section className="py-20 md:py-28" style={{ background: T.surface }}>
        <Wrap narrow>
          <Eyebrow>Lo que cuesta</Eyebrow>

          <p
            className="mt-8 font-black leading-none tabular-nums"
            style={{ fontSize: "clamp(3.5rem, 13vw, 7rem)", color: T.lime }}
          >
            199 €<span style={{ fontSize: "0.3em", color: T.fg }}>/mes</span>
          </p>

          <p className="mt-6 text-xl font-bold leading-snug">
            Campañas, web, CRM, agenda y el panel. Todo dentro.
          </p>

          <ul className="mt-8 space-y-3 text-lg" style={{ color: T.muted }}>
            <li>
              <strong style={{ color: T.fg }}>Sin permanencia.</strong> Te quedas porque
              funciona, no porque te obliguemos.
            </li>
            <li>
              <strong style={{ color: T.fg }}>Hay una cuota de alta</strong>, porque montar
              todo esto lleva trabajo. Depende de lo que inviertas y de cuántos canales lleves.
            </li>
            <li>
              <strong style={{ color: T.fg }}>La inversión en publicidad</strong> la pagas tú
              directamente a Google y Meta. Nunca pasa por nosotros.
            </li>
          </ul>

          <div className="mt-14" style={{ borderTop: `1px solid ${T.line}` }}>
            <p
              className="mt-14 font-black leading-tight tracking-[-0.02em] text-balance"
              style={{ fontSize: "clamp(1.75rem, 4.5vw, 3rem)" }}
            >
              Empieza por saber{" "}
              <span style={{ color: T.lime }}>cuánto te cuesta hoy</span> un paciente.
            </p>
            <a
              href="#calculadora"
              className="mt-10 inline-flex h-14 items-center justify-center rounded-full px-9 text-base font-bold transition-transform hover:-translate-y-0.5"
              style={{ background: T.lime, color: T.ink }}
            >
              Calcula qué te cuesta un paciente
            </a>
          </div>
        </Wrap>
      </section>
    </>
  );
}
