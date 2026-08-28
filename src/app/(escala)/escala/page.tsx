import type { Metadata } from "next";
import Link from "next/link";
import { GROWTH, GROWTH_THEME as T } from "@/lib/growth-config";
import { CONTACT_INFO } from "@/lib/contact-info";
import { Pasos } from "./_components/Pasos";
import { Subrayado } from "./_components/Subrayado";
import { Circulo } from "./_components/Circulo";
import { Trama } from "./_components/Trama";
import { Logotipo } from "./_components/Logotipo";
import { FormularioHero } from "./_components/FormularioHero";
import { Planes } from "./_components/Planes";
import { Faqs } from "./_components/Faqs";
import { AlAparecer } from "./_components/AlAparecer";

export const metadata: Metadata = {
  title: "Llenar tu agenda es fácil. Ganar más, no",
  description:
    "Un sistema integral que se ocupa de todo el proceso, con un único objetivo: que cada euro invertido genere más. Desde 199 €/mes y sin permanencia.",
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
  ancho = false,
  className = "",
}: {
  children: React.ReactNode;
  narrow?: boolean;
  /**
   * Solo el hero. 124 rem en vez de 110: el titular se mide contra el ancho de
   * su columna, así que cada centímetro que se le da al contenedor sale
   * directamente en el tamaño de letra. En las secciones de texto ese ancho de
   * más sería peor —una línea de prosa de 1900 px no se lee, se recorre con el
   * cuello—, pero el hero no es prosa: son ocho palabras.
   */
  ancho?: boolean;
  className?: string;
}) {
  const tope = narrow ? "max-w-4xl" : ancho ? "max-w-[124rem]" : "max-w-[110rem]";
  return (
    <div className={`mx-auto w-full px-6 sm:px-10 lg:px-14 ${tope} ${className}`}>
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
    d: "Tu web y tus campañas en Google y Meta, montadas y gestionadas por el mismo equipo.",
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
      {/* **La pantalla entera, y nada más que el hero.** Estaba en 80svh y el
          resultado era el peor de los dos mundos: no llenaba la pantalla, pero
          asomaba un dedo de la sección siguiente por abajo. Esa franja de otro
          color no invita a bajar —para eso hace falta que se note que hay algo
          debajo, no verlo a medias— y en cambio le quita al titular la única
          ventaja que tiene un hero, que es ser lo único que se ve.

          Se condiciona a `lg:landscape` y no a un ancho a secas: el problema no
          es la anchura sino la proporción. En cualquier viewport vertical
          —móvil o tableta— el contenido ocupa un tercio de la altura, así que
          centrarlo dentro de 100svh dejaría entre 500 y 750 px muertos. Fuera
          de apaisado manda un suelo en píxeles, que no crece con la altura de
          la pantalla y por tanto no puede volver a abrir ese hueco.

          `svh` y no `vh`: en el móvil, `vh` cuenta la barra del navegador como
          si no estuviera y el botón del formulario queda por debajo del corte. */}
      <header className="relative flex min-h-[30rem] items-center overflow-hidden py-12 md:py-16 lg:landscape:min-h-svh lg:landscape:py-20">
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
        <Wrap ancho className="relative">
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

                **El tope sube de 7 a 8,75 rem.** Quien limita el tamaño es el
                9,4 cqw, que es el que garantiza que la frase quepa en un
                renglón; el tope solo decidía a partir de qué ancho de columna
                el titular dejaba de crecer, y a 7 rem frenaba justo en los
                monitores donde más sitio hay. Subirlo no puede partir la frase
                —de eso se sigue encargando el cqw—, solo deja que llene la
                pantalla que tiene delante.

                Por debajo de 640 px se le deja partirse: ahí no hay tamaño
                legible que la meta en un renglón. */}
            <div style={{ containerType: "inline-size" }}>
              {/* El logotipo va dentro de la columna del titular y no en una
                  barra propia: esta landing no tiene navegación —no hay a dónde
                  ir— y ponerle una cabecera al uso solo serviría para quitarle
                  altura al hero. */}
              <Logotipo className="mb-12 lg:mb-20" />

              {/* **`text-balance` para que ninguna línea se quede coja.**
                  Por debajo de 640 px las dos frases pueden partirse, y el
                  navegador parte donde deja de caber: "Llenar tu agenda es" y
                  debajo "fácil." sola. Una palabra suelta en su propio renglón
                  no es un titular, es un titular roto — y en un titular a este
                  tamaño se ve antes que se lee.

                  Con `balance`, el navegador reparte el texto entre las líneas
                  que necesite en vez de llenar la primera hasta el borde, así
                  que sale "Llenar tu agenda / es fácil.". No hace falta elegir
                  el punto de corte a mano frase por frase, que además habría
                  que rehacer cada vez que cambie el texto. */}
              <h1
                className="font-black leading-[0.94] tracking-[-0.035em] text-balance"
                style={{ fontSize: "clamp(2.75rem, 9.5cqw, 10rem)" }}
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
                className="mt-9 max-w-3xl font-bold leading-[1.3] tracking-[-0.015em] text-balance lg:mt-14"
                style={{ fontSize: "clamp(1.5rem, 2.6vw, 3.25rem)" }}
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
        id="problema"
        className="relative overflow-hidden py-16 md:py-20 lg:py-24"
        style={{ background: T.surface }}
      >
        <Trama motivo="rayas" desde="70% 40%" />
        <Wrap className="relative">
          <AlAparecer>
            <Eyebrow>El problema</Eyebrow>

            <h2
              className="mt-8 max-w-4xl font-black leading-[1.05] tracking-[-0.02em] text-balance"
              style={{ fontSize: "clamp(2.25rem, 5.2vw, 4.5rem)" }}
            >
              Puedes tener la agenda llena y estar perdiendo dinero.
            </h2>
          </AlAparecer>

          {/* Escalonadas: entrando a la vez se leen como un bloque, y lo que
              tienen que leerse es como una comparación — primero una clínica y
              después la otra, que es el orden en que se entiende. */}
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {COMPARATIVA.map((c, i) => (
              <AlAparecer key={c.titulo} retraso={i * 140} className="h-full">
              <div
                className="h-full rounded-3xl p-7 md:p-9"
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
              </AlAparecer>
            ))}
          </div>
        </Wrap>
      </section>

      {/* ───────── 3. La solución ─────────
          Los tres pasos son a la vez la explicación del proceso y el inventario
          de lo que se compra, así que el precio va dos secciones más abajo
          apoyado en ellos: "desde 199 €" solo se entiende si acabas de leer qué
          es "todo esto". */}
      <section
        className="relative overflow-hidden py-16 md:py-20 lg:py-24"
        style={{ background: T.surface }}
      >
        <Trama desde="25% 30%" />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 right-0 h-[32rem] w-[32rem] rounded-full blur-[130px]"
          style={{ background: T.lime, opacity: 0.09 }}
        />
        <Wrap className="relative">
          <AlAparecer>
            <Eyebrow>La solución</Eyebrow>

            <h2
              className="mt-8 max-w-5xl font-black leading-[1.02] tracking-[-0.03em] text-balance"
              style={{ fontSize: "clamp(2.5rem, 6vw, 5.5rem)" }}
            >
              Un sistema integral.
              <br />
              <span style={{ color: T.lime }}>De principio a fin.</span>
            </h2>

          {/* El subtítulo, y lo que de verdad compra una clínica: no un
              sistema, sino dejar de ocuparse de esto.

              Estuvo suelto después de los tres pasos, de remate. Aquí funciona
              mejor por una razón que no es de maquetación: "todo lo demás" pide
              que le expliquen qué es, y justo debajo están los tres pasos
              diciéndolo. Antes cerraba; ahora abre. */}
            <p
              className="mt-8 font-bold leading-[1.2] tracking-[-0.015em] text-balance"
              style={{ fontSize: "clamp(1.375rem, 2.4vw, 2.25rem)" }}
            >
              Tú encárgate de darle un buen servicio a tus pacientes.{" "}
              <span style={{ color: T.lime }}>Nosotros, de todo lo demás.</span>
            </p>
          </AlAparecer>

          <Pasos pasos={PASOS} />

        </Wrap>
      </section>

      {/* ───────── 4. Los planes ─────────
          El título estuvo DENTRO de la tabla, en la casilla vacía de la
          esquina, para no separar los precios de los tres pasos que los
          justifican. Salió mal: sin nada que abriera la sección, la tabla
          aparecía de golpe y ni siquiera se veía que había empezado un
          capítulo nuevo. Con su cabecera —etiqueta, título y una línea que
          engancha el precio con lo que se acaba de leer— la sección se
          anuncia, y el enganche lo hace ahora la frase, que es su trabajo. */}
      <section
        className="relative overflow-hidden py-16 md:py-20 lg:py-24"
        style={{ background: T.surface }}
      >
        <Trama desde="75% 40%" />
        <Wrap className="relative">
          {/* El título de esta sección va DENTRO de `Planes`, en la esquina de
              la tabla. Ver el porqué allí: aquí fuera dejaba una banda vacía a
              su derecha y otra entre él y la tabla. */}
          <AlAparecer>
            <Planes />
          </AlAparecer>
        </Wrap>
      </section>

      {/* ───────── 5. El compromiso ─────────
          Va justo después del precio y las garantías: es la respuesta a la
          desconfianza que deja cualquier tarifa.

          Va sobre lima y en negro, la única sección de toda la página que
          invierte los colores. Después de cuatro pantallas de fondo oscuro, el
          cambio se nota antes de leer una palabra — y esta es justo la frase
          que tiene que quedarse.

          Ya no reserva la pantalla entera: al quitarle el botón de debajo se
          quedaba media pantalla de negro entre la calculadora y la frase, que
          es justo el hueco que esta página tenía de más por todas partes. */}
      <section className="flex items-center py-20 md:py-24 lg:py-28" style={{ background: T.lime, color: T.ink }}>
        <Wrap>
          {/* Dos líneas, y el corte en la coma.

              El tamaño sale de ahí y no al revés: para que "Vas a querer
              quedarte por los resultados," quepa entera en un renglón a 1024 px
              —el ancho más estrecho donde se le prohíbe partirse— no puede pasar
              de 4,4vw. Es más pequeña que antes, y es el precio de que la frase
              no se rompa por la mitad. Debajo de lg sí se parte, porque en un
              móvil no hay tamaño que la deje en dos líneas sin que se lea con
              lupa. */}
          <AlAparecer>
            <p
              className="font-black leading-[1.02] tracking-[-0.035em] text-balance"
              style={{ fontSize: "clamp(2rem, 4.4vw, 5rem)" }}
            >
              <span className="lg:whitespace-nowrap">
                Vas a querer quedarte por los resultados,
              </span>
              <br />
              <span className="lg:whitespace-nowrap">no porque te obliguemos.</span>
            </p>

            {/* **WhatsApp y no otro formulario.** Aquí hubo un tiempo sin
                botón, y el argumento era bueno: repetir la misma llamada a la
                acción convierte el cierre en un anuncio. Lo que cambia es que
                esto no repite nada — el formulario del hero pide un teléfono
                para que llamemos nosotros, y hay bastante gente que no lo deja
                pero sí escribe. Son dos puertas distintas para dos personas
                distintas, no la misma dos veces.

                Y va justo detrás de "no porque te obliguemos" a propósito: es
                el momento con menos fricción de la página, y escribir por
                WhatsApp es el gesto que menos compromete de todos los que se
                pueden pedir. */}
            <div className="mt-10">
              <a
                href={CONTACT_INFO.socials.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 rounded-full px-7 py-4 text-base font-bold transition-transform hover:-translate-y-0.5 sm:text-lg"
                style={{ background: T.ink, color: T.fg }}
              >
                <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="currentColor">
                  <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23a8.2 8.2 0 0 1 8.24 8.24c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.16 0-.43.06-.65.31-.22.25-.85.83-.85 2.03s.87 2.35.99 2.51c.12.17 1.71 2.61 4.15 3.66.58.25 1.03.4 1.39.51.58.19 1.11.16 1.53.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.11-.22-.17-.47-.29Z" />
                </svg>
                Escríbenos por WhatsApp
              </a>
            </div>
          </AlAparecer>
        </Wrap>
      </section>

      {/* ───────── 6. Preguntas frecuentes ─────────
          Después de la frase del compromiso y no antes del precio. Quien llega
          hasta aquí ya ha visto la tabla y ya ha decidido si le encaja; lo que
          le queda es la desconfianza, y eso no se resuelve con más argumentos
          sino contestando la pregunta incómoda con su nombre. Puestas antes,
          estas mismas respuestas plantarían dudas que el lector todavía no
          tenía.

          Vuelve al fondo oscuro a propósito: el bloque lima de arriba es el
          cierre emocional y tiene que quedarse como tal. Esto de aquí es la
          letra pequeña bien contada, y se lee mejor con el tono de siempre. */}
      <section
        className="relative overflow-hidden py-16 md:py-20 lg:py-24"
        style={{ background: T.surface }}
      >
        <Trama motivo="rayas" desde="20% 60%" />
        <Wrap className="relative">
          <AlAparecer>
            <Faqs />
          </AlAparecer>
        </Wrap>
      </section>

    </>
  );
}
