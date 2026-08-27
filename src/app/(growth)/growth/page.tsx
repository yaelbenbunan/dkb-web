import type { Metadata } from "next";
import Link from "next/link";
import { GROWTH, GROWTH_THEME as T } from "@/lib/growth-config";
import { LineaDeTiempo } from "./_components/LineaDeTiempo";
import { Subrayado } from "./_components/Subrayado";
import { FormularioHero } from "./_components/FormularioHero";

export const metadata: Metadata = {
  title: "Llenar tu agenda es fácil. Ganar más, no",
  description:
    "Un sistema integral que se ocupa de todo el proceso, con un único objetivo: que cada euro invertido genere más. Desde 299 €/mes, sin cuota de alta y sin permanencia.",
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

/**
 * Ancho máximo propio: no usamos el Container del sitio para no heredar su
 * escala, pensada para páginas corporativas.
 *
 * 1408 px y no 1152: con el ancho anterior, en un portátil normal quedaban
 * cuatro dedos de negro a cada lado y todo el contenido apretado en el centro.
 * La página parecía alejada, como si el navegador tuviera el zoom bajado. Un
 * ancho mayor con más aire dentro llena la pantalla sin apretar nada.
 */
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
      className={`mx-auto w-full px-6 sm:px-10 lg:px-14 ${narrow ? "max-w-4xl" : "max-w-[88rem]"} ${className}`}
    >
      {children}
    </div>
  );
}

/** Etiqueta pequeña en mayúsculas que abre cada sección. */
function Eyebrow({ children, color = T.lime }: { children: React.ReactNode; color?: string }) {
  return (
    <p className="text-sm font-bold uppercase tracking-[0.24em]" style={{ color }}>
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
    color: T.muted,
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
 * Los tres pasos del sistema, en orden cronológico real.
 *
 * Eran cuatro y sobraba uno: "no se pierde ni uno" y "sabemos quién vino" son
 * el mismo tramo contado dos veces —lo que le pasa al paciente desde que deja
 * el teléfono hasta que se sienta en el sillón—. Tres pasos se leen de una
 * pasada; cuatro ya piden esfuerzo.
 *
 * Hacen doble trabajo: explican el proceso y son, a la vez, el inventario de
 * lo que entra en la cuota. Por eso el precio va justo detrás — "todo esto,
 * por 299 €" solo se entiende si acabas de leer qué es "todo esto".
 *
 * Y ninguno dice "CRM". Lo entiende quien ya sabe lo que es, que no es el
 * dueño de una clínica dental.
 */
const PASOS = [
  {
    n: "01",
    t: "Traemos los pacientes",
    d: "Nos encargamos de todo: tu web, la estrategia y las campañas en Google y Meta. No tienes que contratar nada por separado.",
  },
  {
    n: "02",
    t: "Los pasamos a tu agenda",
    d: "Cada paciente entra en un sistema de gestión con su ficha y de dónde vino. Tu recepción lo llama, le da hora, y la cita se escribe en la agenda de la clínica.",
  },
  {
    n: "03",
    t: "Analizamos tu rentabilidad",
    d: "Quién acudió de verdad, qué tratamiento se hizo y cuánto facturó. Con eso sabemos qué campañas te rentan y cuáles no, y ajustamos cada mes.",
  },
];

/**
 * Las tres promesas que responden a la desconfianza que deja cualquier tarifa.
 *
 * La cuota de alta se cae de aquí porque se cae del producto: la barrera de
 * entrada tiene que ser lo más baja posible, y siempre se puede volver a poner.
 * En su sitio entra la que más tranquiliza a quien ya se ha quemado con una
 * agencia — que el dinero de los anuncios no pasa por nosotros.
 */
const GARANTIAS = [
  {
    t: "Sin desembolsos grandes",
    d: "Pagas mes a mes. Ni cuota de alta, ni inversiones iniciales de miles de euros, ni contratos a un año.",
  },
  {
    t: "Tu inversión es tuya",
    d: "Los anuncios los pagas tú directamente a Google y a Meta, con tu tarjeta. Ese dinero no pasa por nuestras manos.",
  },
  {
    t: "Sin comisión sobre lo que gastas",
    d: "Muchas agencias se llevan un porcentaje de tu inversión, así que ganan más cuanto más gastes. Aquí la cuota es la cuota.",
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
      <header className="relative flex min-h-[32rem] items-center overflow-hidden py-16 lg:landscape:min-h-[88svh]">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full blur-[120px]"
          style={{ background: T.lime, opacity: 0.1 }}
        />
        <Wrap className="relative">
          {/* **El titular y el formulario, uno al lado del otro.**
              El formulario lleva ancho fijo y el titular se queda con lo que
              sobre. Es al revés de lo normal —repartir en fracciones— y es a
              propósito: con fracciones, el titular crecía con la pantalla y a
              1375 px se partía en tres líneas. Con el formulario clavado en
              23 rem, lo que le queda al titular es previsible, y por eso se
              puede impedir que se corte sin que se salga nunca.

              El tamaño está calculado para que "Llenar tu agenda es fácil."
              quepa entero en esa columna. Si algún día cambia esa frase, hay
              que volver a mirarlo. */}
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-16">
            <div>
              <h1
                className="font-black leading-[0.9] tracking-[-0.035em]"
                style={{ fontSize: "clamp(2.5rem, 5vw, 3.75rem)" }}
              >
                <span className="lg:whitespace-nowrap">Llenar tu agenda es fácil.</span>
                <br />
                <span className="lg:whitespace-nowrap" style={{ color: T.lime }}>
                  Ganar más, no.
                </span>
              </h1>

              {/* En blanco entero: el lima ya está en el titular, justo encima,
                  y repetirlo aquí hacía que las dos frases compitieran. Lo que
                  destaca "ganar más" es el trazo, no el color. */}
              <p
                className="mt-8 max-w-xl font-bold leading-[1.3] tracking-[-0.01em] text-balance"
                style={{ fontSize: "clamp(1.375rem, 2.2vw, 1.875rem)" }}
              >
                Cualquiera te trae pacientes. Nosotros te hacemos{" "}
                <Subrayado>ganar más</Subrayado>.
              </p>
            </div>

            <FormularioHero />
          </div>
        </Wrap>
      </header>

      {/* ───────── 2. El problema ───────── */}
      <section className="py-24 md:py-32 lg:py-40" style={{ background: T.surface }}>
        <Wrap>
          <Eyebrow>El problema</Eyebrow>

          <h2
            className="mt-8 max-w-4xl font-black leading-[1.05] tracking-[-0.02em] text-balance"
            style={{ fontSize: "clamp(2.25rem, 5.2vw, 4.5rem)" }}
          >
            Puedes tener la agenda llena y{" "}
            <Subrayado grosor={1.15}>estar perdiendo dinero</Subrayado>.
          </h2>

          <p
            className="mt-7 max-w-2xl leading-relaxed"
            style={{ fontSize: "clamp(1.125rem, 1.5vw, 1.375rem)", color: T.muted }}
          >
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
                  className="text-sm font-bold uppercase tracking-[0.18em]"
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
                      <span className="text-base" style={{ color: T.muted }}>
                        {f.k}
                      </span>
                      <span
                        className="font-black tabular-nums"
                        style={{ fontSize: "clamp(1.5rem, 2.2vw, 1.875rem)" }}
                      >
                        {f.v}
                      </span>
                    </div>
                  ))}
                  <div
                    className="flex items-baseline justify-between gap-3"
                    style={{ borderTop: `1px solid ${T.line}`, paddingTop: "1rem" }}
                  >
                    <span className="text-base font-bold" style={{ color: T.fg }}>
                      Le queda
                    </span>
                    <span
                      className="font-black leading-none tabular-nums"
                      style={{ fontSize: "clamp(2.25rem, 4.5vw, 3.5rem)", color: c.color }}
                    >
                      {c.queda}
                    </span>
                  </div>
                </div>

                <p
                  className="mt-8 font-bold leading-snug"
                  style={{ fontSize: "clamp(1.0625rem, 1.4vw, 1.25rem)" }}
                >
                  {c.remate}
                </p>
              </div>
            ))}
          </div>
        </Wrap>
      </section>

      {/* ───────── 4. La solución: qué es, qué cuesta y qué te llevas ─────────
          Va todo junto a propósito. Separar "cómo funciona" de "lo que cuesta"
          debilitaba las dos partes: el proceso quedaba en teoría y el precio
          aparecía sin contexto. Leídos seguidos, los cuatro pasos son a la vez
          la explicación y el inventario de lo que compras. */}
      <section
        className="relative overflow-hidden py-24 md:py-32 lg:py-40"
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
            className="mt-8 max-w-5xl font-black leading-[1.02] tracking-[-0.03em] text-balance"
            style={{ fontSize: "clamp(2.5rem, 6vw, 5.5rem)" }}
          >
            Un sistema integral.
            <br />
            <span style={{ color: T.lime }}>De principio a fin.</span>
          </h2>

          {/* Los tres pasos, a todo lo ancho para que tengan presencia. El
              hilo se rellena con el scroll: eso es lo que hace que se lean como
              una cadena y no como tres servicios en una lista. */}
          <LineaDeTiempo pasos={PASOS} />

          {/* Y aquí el precio, sobre la espalda de lo que acaba de leer. */}
          <div className="mt-16 pt-14" style={{ borderTop: `1px solid ${T.line}` }}>
            <p
              className="font-bold"
              style={{ fontSize: "clamp(1.25rem, 2vw, 1.75rem)", color: T.muted }}
            >
              Todo esto, de principio a fin, por
            </p>
            <p
              className="mt-2 flex flex-wrap items-baseline gap-x-4 font-black leading-[0.85] tracking-[-0.04em]"
              style={{ fontSize: "clamp(4.5rem, 19vw, 11rem)", color: T.lime }}
            >
              <span className="tabular-nums">299 €</span>
              <span
                className="font-black tracking-[-0.02em]"
                style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)", color: T.fg }}
              >
                al mes
              </span>
            </p>
            <p
              className="mt-4 font-black leading-none"
              style={{ fontSize: "clamp(1.75rem, 4vw, 3rem)" }}
            >
              Sin permanencia.
            </p>
            <p
              className="mt-6 max-w-2xl leading-relaxed"
              style={{ fontSize: "clamp(1.0625rem, 1.4vw, 1.25rem)", color: T.muted }}
            >
              Un canal de captación incluido. Por{" "}
              <strong style={{ color: T.fg, fontWeight: 700 }}>399 € al mes</strong> añadimos el
              segundo canal y la confirmación de citas por WhatsApp.
            </p>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {GARANTIAS.map((g) => (
                <div key={g.t}>
                  <p className="text-lg font-bold">{g.t}</p>
                  <p className="mt-2 text-base leading-relaxed" style={{ color: T.muted }}>
                    {g.d}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Wrap>
      </section>

      {/* ───────── 5. El número que no tienen ─────────
          La calculadora vive fuera de la landing, así que aquí hay que darle
          una razón para ir — y la razón es el argumento entero del producto:
          para hacerte ganar más, primero hay que medir.

          La cifra va en el mismo cuerpo gigante que el precio de la sección
          anterior, y a propósito: el lector acaba de ver un "299 €" enorme y se
          encuentra con un "?? €" del mismo tamaño donde debería estar SU
          número. Ese hueco hace más que cualquier frase. */}
      <section className="py-24 md:py-32 lg:py-40">
        <Wrap>
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
            <div>
              <Eyebrow>Empieza por aquí</Eyebrow>
              <p
                className="mt-8 font-black leading-[0.85] tracking-[-0.04em]"
                style={{ fontSize: "clamp(5rem, 16vw, 12rem)", color: T.lime }}
              >
                ?? €
              </p>
              <p
                className="mt-4 font-bold"
                style={{ fontSize: "clamp(1.125rem, 1.6vw, 1.5rem)", color: T.muted }}
              >
                lo que te cuesta hoy un paciente nuevo
              </p>
            </div>

            <div>
              <h2
                className="font-black leading-[1.02] tracking-[-0.03em] text-balance"
                style={{ fontSize: "clamp(2.25rem, 4.5vw, 4rem)" }}
              >
                Para hacerte ganar más, primero hay que{" "}
                <Subrayado grosor={1.1}>medirlo todo</Subrayado>.
              </h2>

              <p
                className="mt-8 max-w-2xl leading-relaxed"
                style={{ fontSize: "clamp(1.125rem, 1.5vw, 1.375rem)", color: T.muted }}
              >
                Y ese número, el más importante de tu clínica, casi nadie lo tiene. No es
                dejadez:{" "}
                <strong style={{ color: T.fg, fontWeight: 700 }}>
                  es que nadie se lo ha calculado nunca
                </strong>
                . Sin él, cualquiera puede decirte que su campaña ha ido muy bien.
              </p>

              <Link
                href="/growth/calculadora"
                className="mt-10 inline-flex h-16 items-center justify-center rounded-full px-10 text-lg font-bold transition-transform hover:-translate-y-0.5"
                style={{ background: T.lime, color: T.ink }}
              >
                Calcula el tuyo
              </Link>
              <p className="mt-4 text-base" style={{ color: T.muted }}>
                Tres preguntas. Un minuto. Y si no sabes las respuestas, eso ya es el
                diagnóstico.
              </p>
            </div>
          </div>
        </Wrap>
      </section>

      {/* ───────── 6. El compromiso ─────────
          Va justo después del precio y las garantías: es la respuesta a la
          desconfianza que deja cualquier tarifa.

          Ya no reserva la pantalla entera: al quitarle el botón de debajo se
          quedaba media pantalla de negro entre la calculadora y la frase, que
          es justo el hueco que esta página tenía de más por todas partes. */}
      <section className="flex items-center py-28 md:py-36 lg:py-44">
        <Wrap>
          <p
            className="font-black leading-[0.95] tracking-[-0.035em] text-balance"
            style={{ fontSize: "clamp(2.75rem, 7.5vw, 7rem)" }}
          >
            Vas a querer quedarte{" "}
            <span style={{ color: T.lime }}>por los resultados</span>, no porque te obliguemos.
          </p>

          {/* Sin botón: la sección anterior acaba de llevar a la calculadora
              y repetirlo aquí convertiría el cierre en otra llamada a la
              acción. Esta frase se lee mejor sola. */}
        </Wrap>
      </section>

    </>
  );
}
