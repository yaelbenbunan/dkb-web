import type { Metadata } from "next";
import { GROWTH, GROWTH_THEME as T } from "@/lib/growth-config";
import { CalculadoraWizard } from "./_components/CalculadoraWizard";
import { LineaDeTiempo } from "./_components/LineaDeTiempo";

export const metadata: Metadata = {
  title: "Llenar tu agenda es fácil. Ganar más, no",
  description:
    "Un sistema integral que se ocupa de todo el proceso, con un único objetivo: que cada euro invertido genere más. Desde 199 €/mes, sin permanencia.",
  alternates: { canonical: GROWTH.path },
  openGraph: {
    type: "website",
    url: GROWTH.path,
    title: "Llenar tu agenda es fácil. Ganar más, no — dinkbit",
    description:
      "Nos ocupamos de todo el proceso con un único objetivo: que cada euro invertido genere más.",
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
const TICKET_COMPARATIVA = "250 €";

const COMPARATIVA = [
  {
    titulo: "La que llena la agenda",
    color: T.alerta,
    pacientes: "40",
    gasto: "8.000 €",
    factura: "10.000 €",
    queda: "2.000 €",
    remate: "Trabaja a tope. Y cobra por trabajar, no por ganar.",
  },
  {
    titulo: "La que mira los números",
    color: T.lime,
    pacientes: "20",
    gasto: "1.000 €",
    factura: "5.000 €",
    queda: "4.000 €",
    remate: "La mitad de pacientes. El doble de beneficio.",
  },
];

/**
 * Los cuatro pasos del sistema, en orden cronológico real.
 *
 * Hacen doble trabajo: explican el proceso y son, a la vez, el inventario de
 * lo que entra en la cuota. Por eso el precio va justo detrás — "todo esto,
 * por 199 €" solo se entiende si acabas de leer qué es "todo esto".
 */
const PASOS = [
  {
    n: "01",
    t: "Traemos los pacientes",
    d: "Nos encargamos de todo: tu web, la estrategia y las campañas en Google y Meta. No tienes que contratar nada por separado.",
  },
  {
    n: "02",
    t: "No se pierde ni uno",
    d: "Todos los leads entran en nuestro sistema para ser atendidos, con su ficha y su origen. Ninguno se queda sin respuesta.",
  },
  {
    n: "03",
    t: "Sabemos quién vino de verdad",
    d: "Cuando el paciente pasa por consulta se registran dos datos: si acudió y cuánto facturó. Dos toques y ya está.",
  },
  {
    n: "04",
    t: "Optimizamos para que rinda más",
    d: "Hacemos los ajustes necesarios en las campañas para que tu inversión rinda cada vez más. Tú lo ves todo en el panel.",
  },
];

const GARANTIAS = [
  {
    t: "Sin desembolsos grandes",
    d: "Pagas mes a mes. Ni inversiones iniciales de miles de euros ni contratos a un año.",
  },
  {
    t: "Una cuota de alta, dicha por delante",
    d: "Montarlo todo lleva trabajo, así que hay un pago inicial. Lo sabrás antes de empezar, nunca en la última llamada.",
  },
  {
    t: "Sin comisión sobre tu inversión",
    d: "Muchas agencias se llevan un porcentaje de lo que gastas en anuncios. Aquí la cuota es la cuota.",
  },
];

export default function GrowthPage() {
  return (
    <>
      {/* ───────── 1. Hero ───────── */}
      {/* Alturas contenidas a propósito: todo el hero, botón incluido, tiene
          que caber sin scroll nada más entrar, también en portátiles bajos.

          La pantalla completa se condiciona a `lg:landscape` y no a un ancho a
          secas: el problema no es la anchura sino la proporción. En cualquier
          viewport vertical —móvil o tableta— el contenido ocupa un tercio de la
          altura, así que centrarlo dentro de 100svh dejaba entre 500 y 750 px
          muertos. Fuera de apaisado manda un suelo en píxeles, que no crece con
          la altura de la pantalla y por tanto no puede volver a abrir el hueco. */}
      <header className="relative flex min-h-[32rem] items-center overflow-hidden py-16 lg:landscape:min-h-[100svh]">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full blur-[120px]"
          style={{ background: T.lime, opacity: 0.1 }}
        />
        <Wrap className="relative">
          {/* Sin etiqueta de audiencia por encima: daba por hecho que la
              clínica ya invierte en publicidad, y muchas de las que interesan
              todavía no lo hacen. La palabra "pacientes" del subtítulo ya
              señala a quién va dirigido. */}
          <h1
            className="font-black leading-[0.92] tracking-[-0.03em]"
            style={{ fontSize: "clamp(2.5rem, 7.5vw, 5.75rem)" }}
          >
            Llenar tu agenda es fácil.
            <br />
            <span style={{ color: T.lime }}>Ganar más, no.</span>
          </h1>

          <p
            className="mt-7 max-w-2xl leading-relaxed"
            style={{ fontSize: "clamp(1.0625rem, 1.9vw, 1.375rem)", color: T.muted }}
          >
            Cualquiera te trae pacientes. Nosotros, además, te decimos{" "}
            <strong style={{ color: T.fg, fontWeight: 700 }}>
              cuáles te dejan dinero y cuáles te lo quitan
            </strong>
            , para que tomes mejores decisiones.
          </p>

          <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
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
          <Eyebrow color={T.alerta}>El problema</Eyebrow>

          <h2
            className="mt-8 max-w-4xl font-black leading-[1.05] tracking-[-0.02em] text-balance"
            style={{ fontSize: "clamp(2rem, 5.5vw, 4rem)" }}
          >
            Puedes tener la agenda llena y{" "}
            <span style={{ color: T.alerta }}>estar perdiendo dinero</span>.
          </h2>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed" style={{ color: T.muted }}>
            Dos clínicas del mismo tamaño, el mismo mes y el mismo ticket medio:
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

                <div className="mt-7 space-y-4">
                  {[
                    { k: "Ticket medio", v: TICKET_COMPARATIVA },
                    { k: "Pacientes nuevos", v: c.pacientes },
                    { k: "Se gasta en traerlos", v: c.gasto },
                    { k: "Factura", v: c.factura },
                  ].map((f) => (
                    <div key={f.k} className="flex items-baseline justify-between gap-3">
                      <span className="text-sm" style={{ color: T.muted }}>
                        {f.k}
                      </span>
                      <span className="text-2xl font-black tabular-nums">{f.v}</span>
                    </div>
                  ))}
                  <div
                    className="flex items-baseline justify-between gap-3"
                    style={{ borderTop: `1px solid ${T.line}`, paddingTop: "1rem" }}
                  >
                    <span className="text-sm font-bold" style={{ color: T.fg }}>
                      Le queda
                    </span>
                    <span
                      className="font-black leading-none tabular-nums"
                      style={{ fontSize: "clamp(2rem, 6.5vw, 3rem)", color: c.color }}
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

      {/* ───────── 3. La bisagra: la frase, a pantalla completa en apaisado ─────────
          En vertical la frase se queda en 114 px de texto: reservarle la pantalla
          entera eran 730 px de negro alrededor. Ahí manda el relleno. */}
      <section className="flex items-center py-24 lg:landscape:min-h-[100svh]">
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

      {/* ───────── 4. La solución: qué es, qué cuesta y qué te llevas ─────────
          Va todo junto a propósito. Separar "cómo funciona" de "lo que cuesta"
          debilitaba las dos partes: el proceso quedaba en teoría y el precio
          aparecía sin contexto. Leídos seguidos, los cuatro pasos son a la vez
          la explicación y el inventario de lo que compras. */}
      <section
        className="relative overflow-hidden py-20 md:py-28"
        style={{ background: T.surface }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 right-0 h-[32rem] w-[32rem] rounded-full blur-[130px]"
          style={{ background: T.lime, opacity: 0.09 }}
        />
        <Wrap className="relative">
          <Eyebrow>La solución</Eyebrow>

          <h2
            className="mt-8 max-w-4xl font-black leading-[1.02] tracking-[-0.03em] text-balance"
            style={{ fontSize: "clamp(2.25rem, 6.5vw, 4.75rem)" }}
          >
            Un sistema integral.
            <br />
            <span style={{ color: T.lime }}>De principio a fin.</span>
          </h2>

          <p
            className="mt-8 max-w-3xl leading-relaxed"
            style={{ fontSize: "clamp(1.125rem, 2.2vw, 1.5rem)", color: T.muted }}
          >
            No contratas piezas sueltas ni te dejamos un programa para que te apañes.{" "}
            <strong style={{ color: T.fg, fontWeight: 700 }}>
              Nos ocupamos de todo el proceso
            </strong>{" "}
            con un único objetivo:{" "}
            {/* En una sola línea: partida a la mitad pierde toda la fuerza. */}
            <strong
              className="inline-block whitespace-nowrap"
              style={{ color: T.lime, fontWeight: 700 }}
            >
              que cada euro invertido genere más
            </strong>
            .
          </p>

          {/* Los cuatro pasos, a todo lo ancho para que tengan presencia. El
              hilo se rellena con el scroll: eso es lo que hace que se lean como
              una cadena y no como cuatro servicios en una lista. */}
          <LineaDeTiempo pasos={PASOS} />

          {/* Y aquí el precio, sobre la espalda de lo que acaba de leer. */}
          <div className="mt-16 pt-14" style={{ borderTop: `1px solid ${T.line}` }}>
            <p className="text-xl font-bold" style={{ color: T.muted }}>
              Todo esto, de principio a fin, por
            </p>
            <p
              className="mt-2 flex flex-wrap items-baseline gap-x-4 font-black leading-[0.85] tracking-[-0.04em]"
              style={{ fontSize: "clamp(4.5rem, 19vw, 11rem)", color: T.lime }}
            >
              <span className="tabular-nums">199 €</span>
              <span
                className="font-black tracking-[-0.02em]"
                style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)", color: T.fg }}
              >
                al mes
              </span>
            </p>
            <p
              className="mt-4 font-black leading-none"
              style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)" }}
            >
              Sin permanencia.
            </p>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {GARANTIAS.map((g) => (
                <div key={g.t}>
                  <p className="font-bold">{g.t}</p>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: T.muted }}>
                    {g.d}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Wrap>
      </section>

      {/* ───────── 5. El compromiso ─────────
          Va justo después del precio y las garantías: es la respuesta a la
          desconfianza que deja cualquier tarifa, y por eso se lleva la pantalla
          entera para ella sola —en apaisado, por lo mismo que la bisagra. */}
      <section className="flex items-center py-24 lg:landscape:min-h-[100svh]">
        <Wrap>
          <p
            className="font-black leading-[0.95] tracking-[-0.03em] text-balance"
            style={{ fontSize: "clamp(2.5rem, 8vw, 6.5rem)" }}
          >
            Vas a querer quedarte{" "}
            <span style={{ color: T.lime }}>por los resultados</span>, no porque te obliguemos.
          </p>

          <a
            href="#calculadora"
            className="mt-14 inline-flex h-14 items-center justify-center rounded-full px-9 text-base font-bold transition-transform hover:-translate-y-0.5"
            style={{ background: T.lime, color: T.ink }}
          >
            Calcula qué te cuesta un paciente
          </a>
        </Wrap>
      </section>

      {/* ───────── 6. La calculadora ───────── */}
      <section id="calculadora" className="scroll-mt-8 pb-24 pt-8 md:pb-32">
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
    </>
  );
}
