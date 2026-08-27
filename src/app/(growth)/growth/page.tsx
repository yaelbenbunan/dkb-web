import type { Metadata } from "next";
import Link from "next/link";
import { GROWTH, GROWTH_THEME as T } from "@/lib/growth-config";
import { Pasos } from "./_components/Pasos";
import { Subrayado } from "./_components/Subrayado";
import { Circulo } from "./_components/Circulo";
import { Trama } from "./_components/Trama";
import { Logotipo } from "./_components/Logotipo";
import { FormularioHero } from "./_components/FormularioHero";
import { Planes } from "./_components/Planes";

export const metadata: Metadata = {
  title: "Llenar tu agenda es fácil. Ganar más, no",
  description:
    "Un sistema integral que se ocupa de todo el proceso, con un único objetivo: que cada euro invertido genere más. Desde 199 €/mes, sin cuota de alta y sin permanencia.",
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
 * 1760 px y no 1152: con el ancho de antes, en una pantalla de 1920 quedaban
 * 256 px muertos a cada lado —más de una cuarta parte del monitor— y todo el
 * contenido apretado en el centro. La página parecía alejada, como si el
 * navegador tuviera el zoom bajado.
 *
 * Se topa igualmente, y no se deja crecer sin límite: una línea de texto de
 * 2000 px no se lee, se recorre con el cuello. Lo que se busca es llenar un
 * monitor normal, no cualquier monitor.
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
      className={`mx-auto w-full px-6 sm:px-10 lg:px-14 ${narrow ? "max-w-4xl" : "max-w-[110rem]"} ${className}`}
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
 * Es la pieza que sostiene todo el argumento: una trabaja el doble y se lleva un
 * tercio. Va en cifras grandes y no en prosa porque el dueño de una clínica
 * reconoce su propia situación en un número antes que en un párrafo.
 *
 * Se llaman "Clínica 1" y "Clínica 2" y no "la que llena la agenda" / "la que
 * mira los números". Aquellas etiquetas ya daban el veredicto antes de enseñar
 * los números, y así el lector no comparaba: leía una conclusión. Con dos
 * nombres neutros tiene que mirar las cifras, que es donde está la fuerza. La
 * frase de debajo de cada tarjeta sigue diciendo quién es quién, pero después.
 */
const TICKET_COMPARATIVA = "250 €";

const COMPARATIVA = [
  {
    titulo: "Clínica 1",
    color: T.muted,
    pacientes: "40",
    gasto: "8.000 €",
    factura: "10.000 €",
    queda: "2.000 €",
    rodeado: false,
    remate: "Trabaja a tope. Y cobra por trabajar, no por ganar.",
  },
  {
    titulo: "Clínica 2",
    color: T.lime,
    pacientes: "20",
    gasto: "1.000 €",
    factura: "5.000 €",
    queda: "4.000 €",
    // Solo ésta se rodea: si se marcaran las dos, no señalaría nada.
    rodeado: true,
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
 * desde 199 €" solo se entiende si acabas de leer qué es "todo esto".
 *
 * Y ninguno dice "CRM". Lo entiende quien ya sabe lo que es, que no es el
 * dueño de una clínica dental.
 */
const PASOS = [
  {
    n: "01",
    t: "Traemos los pacientes",
    d: "Tu web y tus campañas en Google y Meta. No contratas nada por separado.",
  },
  {
    n: "02",
    t: "Los pasamos a tu agenda",
    d: "Entran en un sistema con su ficha y su origen. Tu recepción llama, da hora, y la cita se escribe en tu calendario.",
  },
  {
    n: "03",
    t: "Analizamos tu rentabilidad",
    d: "Quién acudió, qué se hizo y cuánto facturó. Con eso ajustamos las campañas cada mes.",
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
      <header className="relative flex min-h-[30rem] items-center overflow-hidden py-12 md:py-16 lg:landscape:min-h-[80svh]">
        {/* Tres capas para que la cabecera deje de ser un rectángulo negro, y
            ninguna se ve como tal: una trama de puntos que da textura sin hacer
            ruido, un halo verde detrás del formulario —que además empuja la
            tarjeta clara hacia delante— y otro más flojo arriba a la izquierda
            para que el titular no flote sobre la nada. */}
        <Trama />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 top-1/2 h-[42rem] w-[42rem] -translate-y-1/2 rounded-full blur-[130px]"
          style={{ background: T.lime, opacity: 0.16 }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full blur-[140px]"
          style={{ background: T.lime, opacity: 0.07 }}
        />
        <Wrap className="relative">
          {/* **El titular y el formulario, uno al lado del otro.**
              El formulario lleva ancho fijo y el titular se queda con lo que
              sobre. Es al revés de lo normal —repartir en fracciones— y es a
              propósito: con fracciones, el titular crecía con la pantalla y a
              1375 px se partía en tres líneas. */}
          <div className="grid items-center gap-10 xl:grid-cols-[minmax(0,1fr)_27rem] xl:gap-14">
            {/* **El tamaño del titular se mide contra su columna, no contra la
                ventana.** Con `vw` había que elegir el peor caso —el ancho más
                estrecho donde hay dos columnas— y dejarlo pequeño en todos los
                demás. Con `cqw` el cálculo es exacto en cada ancho, sea la que
                sea la columna.

                El 9,4 no es una estimación: la frase mide 10,27 veces su propio
                cuerpo, medido en el navegador, así que cabe hasta 9,7 cqw y se
                deja un dedo de margen. Si algún día cambia la frase, hay que
                volver a medirla — a ojo sale un número mucho más conservador y
                el titular se queda pequeño sin que se note por qué.

                Por debajo de 640 px se le deja partirse: ahí no hay tamaño
                legible que la meta en un renglón. */}
            <div style={{ containerType: "inline-size" }}>
              {/* El logotipo va dentro de la columna del titular y no en una
                  barra propia: esta landing no tiene navegación —no hay a dónde
                  ir— y ponerle una cabecera al uso solo serviría para quitarle
                  altura al hero. */}
              <Logotipo className="mb-10" />

              <h1
                className="font-black leading-[0.88] tracking-[-0.035em]"
                style={{ fontSize: "clamp(2.5rem, 9.4cqw, 7rem)" }}
              >
                <span className="whitespace-nowrap max-sm:whitespace-normal">
                  Llenar tu agenda es fácil.
                </span>
                <br />
                <span
                  className="whitespace-nowrap max-sm:whitespace-normal"
                  style={{ color: T.lime }}
                >
                  Ganar más, no.
                </span>
              </h1>

              {/* En blanco entero: el lima ya está en el titular, justo encima,
                  y repetirlo aquí hacía que las dos frases compitieran. Lo que
                  destaca "ganar más" es el trazo, no el color. */}
              <p
                className="mt-7 max-w-2xl font-bold leading-[1.25] tracking-[-0.015em] text-balance"
                style={{ fontSize: "clamp(1.5rem, 2.1vw, 2.125rem)" }}
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
      <section
        className="relative overflow-hidden py-20 md:py-24 lg:py-28"
        style={{ background: T.surface }}
      >
        <Trama motivo="rayas" desde="70% 40%" />
        <Wrap className="relative">
          <Eyebrow>El problema</Eyebrow>

          <h2
            className="mt-8 max-w-4xl font-black leading-[1.05] tracking-[-0.02em] text-balance"
            style={{ fontSize: "clamp(2.25rem, 5.2vw, 4.5rem)" }}
          >
            Puedes tener la agenda llena y estar perdiendo dinero.
          </h2>

          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {COMPARATIVA.map((c) => (
              <div
                key={c.titulo}
                className="rounded-3xl p-7 md:p-9"
                style={{
                  background: c.rodeado
                    ? `radial-gradient(120% 100% at 50% 0%, ${T.lime}14, ${T.ink} 60%)`
                    : T.ink,
                  border: `1px solid ${c.color}44`,
                }}
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
                      Beneficio
                    </span>
                    {c.rodeado ? (
                      <Circulo>
                        <span
                          className="font-black leading-none tabular-nums"
                          style={{ fontSize: "clamp(2.25rem, 4.5vw, 3.5rem)", color: c.color }}
                        >
                          {c.queda}
                        </span>
                      </Circulo>
                    ) : (
                      <span
                        className="font-black leading-none tabular-nums"
                        style={{ fontSize: "clamp(2.25rem, 4.5vw, 3.5rem)", color: c.color }}
                      >
                        {c.queda}
                      </span>
                    )}
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

      {/* ───────── 3. La solución: qué es, qué cuesta y qué te llevas ─────────
          Va todo junto a propósito. Separar "cómo funciona" de "lo que cuesta"
          debilitaba las dos partes: el proceso quedaba en teoría y el precio
          aparecía sin contexto. Leídos seguidos, los cuatro pasos son a la vez
          la explicación y el inventario de lo que compras. */}
      <section
        className="relative overflow-hidden py-20 md:py-24 lg:py-28"
        style={{ background: T.surface }}
      >
        <Trama desde="25% 30%" />
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

          <Pasos pasos={PASOS} />

          {/* Y aquí el precio, sobre la espalda de lo que acaba de leer. */}
          <div className="mt-16 pt-14" style={{ borderTop: `1px solid ${T.line}` }}>
            {/* Sin titular encima: el título va dentro de la tabla, en la
                casilla vacía de la esquina. Esa celda existe solo para alinear
                las columnas, así que estaba desaprovechada — y puesto ahí, el
                título no separa la tabla de lo que acaba de leerse. */}
            <Planes />

          </div>
        </Wrap>
      </section>

      {/* ───────── 4. El compromiso ─────────
          Va justo después del precio y las garantías: es la respuesta a la
          desconfianza que deja cualquier tarifa.

          Va sobre lima y en negro, la única sección de toda la página que
          invierte los colores. Después de cuatro pantallas de fondo oscuro, el
          cambio se nota antes de leer una palabra — y esta es justo la frase
          que tiene que quedarse.

          Ya no reserva la pantalla entera: al quitarle el botón de debajo se
          quedaba media pantalla de negro entre la calculadora y la frase, que
          es justo el hueco que esta página tenía de más por todas partes. */}
      <section className="flex items-center py-24 md:py-28 lg:py-32" style={{ background: T.lime, color: T.ink }}>
        <Wrap>
          {/* Dos líneas, y el corte en la coma.

              El tamaño sale de ahí y no al revés: para que "Vas a querer
              quedarte por los resultados," quepa entera en un renglón a 1024 px
              —el ancho más estrecho donde se le prohíbe partirse— no puede pasar
              de 4,4vw. Es más pequeña que antes, y es el precio de que la frase
              no se rompa por la mitad. Debajo de lg sí se parte, porque en un
              móvil no hay tamaño que la deje en dos líneas sin que se lea con
              lupa. */}
          <p
            className="font-black leading-[1.02] tracking-[-0.035em]"
            style={{ fontSize: "clamp(2rem, 4.4vw, 5rem)" }}
          >
            <span className="lg:whitespace-nowrap">
              Vas a querer quedarte por los resultados,
            </span>
            <br />
            <span className="lg:whitespace-nowrap">no porque te obliguemos.</span>
          </p>

          {/* Sin botón: la sección anterior acaba de llevar a la calculadora
              y repetirlo aquí convertiría el cierre en otra llamada a la
              acción. Esta frase se lee mejor sola. */}
        </Wrap>
      </section>

    </>
  );
}
