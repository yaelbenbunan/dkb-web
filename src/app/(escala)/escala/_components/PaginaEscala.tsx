import Image from "next/image";
import { GROWTH_THEME as T } from "@/lib/growth-config";
import { CONTACT_INFO } from "@/lib/contact-info";
import type { SectorEscala } from "@/lib/escala-sectores";
import { Pasos } from "./Pasos";
import { Subrayado } from "./Subrayado";
import { Circulo } from "./Circulo";
import { Trama } from "./Trama";
import { Logotipo } from "./Logotipo";
import { FormularioHero } from "./FormularioHero";
import { Planes } from "./Planes";
import { CalendarioReserva } from "./CalendarioReserva";
import { Faqs } from "./Faqs";
import { AlAparecer } from "./AlAparecer";

/**
 * El cuerpo de la landing, compartido por `/escala` y por cada `/escala/<sector>`.
 *
 * **Existe para que no haya dos copias.** La alternativa era duplicar el fichero
 * por sector, y con cinco copias el día que cambie el precio hay que acordarse de
 * tocarlo en cinco sitios: no se acuerda nadie, y lo que queda es una landing
 * anunciando una tarifa que ya no existe.
 *
 * Lo que cambia por sector son tres cosas —la cabecera, los números de la tabla
 * y las preguntas—; todo lo demás es el mismo producto, y se comparte porque lo
 * es. Los datos vienen de `escala-sectores.ts`, que explica el porqué de cada
 * uno.
 */

/**
 * El subrayado de «Sin permanencia», a mano.
 *
 * **Un `text-decoration` recto se lee como formato; esto se lee como que alguien
 * lo ha subrayado.** Es lo que hace una persona con un boli sobre lo que le
 * importa de un papel, y en una sección que va sobre confianza esa diferencia es
 * el argumento entero: una raya perfecta la pone una hoja de estilos, esta la
 * pone alguien.
 *
 * El trazo va con dos pasadas y no una, porque nadie subraya de una: la segunda
 * es más corta, algo desalineada y más suave, como cuando se repasa sin levantar
 * del todo. Y las dos se pasan de largo por los extremos — un subrayado que
 * empieza y acaba exactamente donde la palabra es otra vez una regla.
 *
 * **Es una forma rellena, no una línea con grosor.** Un trazo estirado a lo ancho
 * del texto con `preserveAspectRatio="none"` se deforma, y el `vector-effect` que
 * lo compensaba dejaba los empalmes de las curvas duros y con dientes. Dibujando
 * el contorno del trazo, el estirón solo lo alarga —que es lo que hace un
 * subrayado más largo— y no toca su forma.
 *
 * Y de paso sale gratis lo que más lo hace parecer un boli: el grosor cambia a lo
 * largo del trazo y se va a nada al final, como cuando se levanta la mano.
 */
function SubrayadoABoli() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 300 20"
      preserveAspectRatio="none"
      className="absolute inset-x-0 -bottom-[0.17em] h-[0.3em] w-full overflow-visible"
      fill="currentColor"
    >
      {/* La pasada de ida. El contorno va de izquierda a derecha por el borde
          de arriba y vuelve por el de abajo, con las dos curvas ligeramente
          distintas: de ahí sale que engorde en el medio y se afile al final. */}
      <path d="M2 12.6C58 6.2 118 12.9 168 9.1 218 5.2 258 10.6 298 6.5c-40 6.9-80 1.6-130 5.5C118 15.8 58 9.6 2 15.8Z" />
      {/* La de vuelta: más corta, más baja y más floja. Nadie subraya de una
          pasada, y es la segunda —desalineada y a medio gas— la que convierte
          esto en un boli y no en una hoja de estilos. */}
      <path
        opacity={0.4}
        d="M28 17.4C94 12.6 170 18.2 246 13.4c-76 6.6-152 1-218 5.6Z"
      />
    </svg>
  );
}

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
 *
 * No cambian por sector: montar la web, traer gente y medir qué dejó es
 * exactamente el mismo trabajo en una consulta de psicología que en una dental.
 */
const PASOS = [
  {
    n: "01",
    t: "Hacemos tu web",
    d: "Montada y alojada por nosotros, pensada para que quien entre pida cita. No hay que tocar nada ni contratar a nadie más.",
  },
  {
    n: "02",
    t: "Traemos tus pacientes",
    d: "Campañas en Google y Meta gestionadas por el mismo equipo. Cada paciente entra en tu sistema con su ficha, su origen y su cita en tu calendario.",
  },
  {
    n: "03",
    t: "Analizamos tu rentabilidad",
    d: "Quién acudió, qué se hizo y cuánto facturó. Con eso ajustamos las campañas cada mes.",
  },
];

/** «pacientes» → «Pacientes», para el rótulo de la tabla. */
function enMayuscula(palabra: string): string {
  return palabra.charAt(0).toUpperCase() + palabra.slice(1);
}

export function PaginaEscala({ sector }: { sector: SectorEscala }) {
  /**
   * Las dos columnas del bloque del problema.
   *
   * Es la pieza que sostiene todo el argumento: una trabaja el doble y se lleva
   * un tercio. Va en cifras grandes y no en prosa porque el dueño de un negocio
   * reconoce su propia situación en un número antes que en un párrafo.
   *
   * Los rótulos son neutros —«sin escala» y «con escala»— y no «la que llena la
   * agenda» / «la que mira los números». Aquellas etiquetas daban el veredicto
   * antes de enseñar los números, y así el lector no comparaba: leía una
   * conclusión. La frase de debajo de cada tarjeta sigue diciendo quién es quién,
   * pero después.
   */
  const comparativa = [
    { ...sector.sinEscala, color: T.muted, conLogo: false, rodeado: false },
    {
      ...sector.conEscala,
      color: T.lime,
      // Solo ésta lleva el logotipo. Es lo que convierte una comparación
      // abstracta en una promesa con nombre: la de la derecha es la que nos
      // tiene a nosotros.
      conLogo: true,
      // Solo ésta se rodea: si se marcaran las dos, no señalaría nada.
      rodeado: true,
    },
  ];

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
      {/* **Mide lo que mide su contenido, y ni un píxel más.**
          Reservaba la pantalla entera (`min-h-svh`) y centraba dentro. Eso tenía
          sentido con el contenido centrado —llenaba— pero dejó de tenerlo en
          cuanto empieza arriba: lo único que quedaba era un hueco muerto abajo
          que hay que pasar con la rueda antes de llegar a lo siguiente. Un hero
          alto no convence a nadie; lo que convence es lo que hay debajo.

          El contenido arranca arriba y no centrado porque con `items-center`
          sobraban 131 px de negro sobre el logotipo, medidos en el navegador:
          eso es lo que hace el centrado cuando el contenido es más corto que la
          ventana. */}
      <header className="relative flex min-h-[26rem] items-start overflow-hidden py-10 md:py-12 lg:py-14">
        {/* Tres capas para que la cabecera deje de ser un rectángulo negro, y
            ninguna se ve como tal: una trama de puntos que da textura sin hacer
            ruido, un halo verde detrás del formulario —que además empuja la
            tarjeta clara hacia delante— y otro más flojo arriba a la izquierda
            para que el titular no flote sobre la nada. */}
        <Trama />

        {/* **La foto del sector, y el degradado que la hace posible.**
            Sola no valdría: estas fotos son de consultas reales —blancas,
            luminosas y con la ventana justo donde va el titular—, así que al 18 %
            todavía levantan el fondo lo suficiente para comerse el contraste del
            texto blanco. El degradado va en diagonal y deja el negro casi entero
            a la izquierda, donde se lee, y suelta la imagen hacia la derecha,
            donde solo hay que reconocer de qué sector es.

            Por eso la opacidad vive aquí y no quemada en el fichero: sube o baja
            en una línea, y el oscurecido usa exactamente el negro del tema. */}
        {sector.imagen && (
          <>
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <Image
                src={sector.imagen}
                alt=""
                fill
                sizes="100vw"
                className="object-cover"
                // **Al 60 %, y la legibilidad la sostiene el degradado.** Pasó
                // por 0,18 y por 0,32 y en las dos había que buscar la foto para
                // encontrarla: una imagen que hay que buscar no distingue una
                // landing de otra, que era justo para lo que está. Subir la
                // opacidad no le quita contraste al titular —de eso se encarga la
                // capa de abajo—, solo hace que la consulta se reconozca.
                style={{ opacity: 0.6 }}
              />
            </div>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                // Negro casi entero bajo el titular y se suelta deprisa a partir
                // de la mitad. Lo que protege el texto es este tramo de la
                // izquierda, no la opacidad de la foto: por eso se puede subir
                // una sin tocar la otra. El lado derecho cae detrás del
                // formulario, que es una tarjeta opaca y no compite con nada.
                background: `linear-gradient(100deg, ${T.ink} 0%, ${T.ink}f7 24%, ${T.ink}b3 46%, ${T.ink}1a 100%)`,
              }}
            />
          </>
        )}

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
          {/* **Arriba, no centradas.** Con `items-center` la columna del texto se
              centraba respecto a la del formulario, que es bastante más alta: de
              ahí salían 111 px de negro por encima del logotipo aunque la
              cabecera ya empezara arriba. Medido en el navegador, no a ojo. */}
          <div className="grid items-start gap-10 xl:grid-cols-[minmax(0,1fr)_27rem] xl:gap-14">
            {/* **El tamaño del titular se mide contra su columna, no contra la
                ventana.** Con `vw` había que elegir el peor caso —el ancho más
                estrecho donde hay dos columnas— y dejarlo pequeño en todos los
                demás. Con `cqw` el cálculo es exacto en cada ancho, sea la que
                sea la columna.

                El 9,5 no es una estimación: la frase original mide 10,27 veces
                su propio cuerpo, medido en el navegador, así que cabe hasta 9,7
                cqw y se deja un dedo de margen.

                **Si se añade un sector, hay que medir su titular.** Las frases
                de los sectores se eligieron de largo parecido al original por
                esto mismo; una notablemente más larga se saldría del renglón, y
                a ojo sale un número mucho más conservador que deja el titular
                pequeño en todas las demás sin que se note por qué.

                Por debajo de 640 px se le deja partirse: ahí no hay tamaño
                legible que la meta en un renglón. */}
            <div style={{ containerType: "inline-size" }}>
              {/* El logotipo va dentro de la columna del titular y no en una
                  barra propia: esta landing no tiene navegación —no hay a dónde
                  ir— y ponerle una cabecera al uso solo serviría para quitarle
                  altura al hero. */}
              <Logotipo className="mb-8 lg:mb-12" />

              {/* Solo en las landings de sector: es lo que dice «esta página es
                  para ti» antes de que se lea el titular. La general no lo
                  lleva, porque no tiene a quién señalar. */}
              {sector.eyebrow && (
                <p
                  className="mb-5 text-sm font-bold uppercase tracking-[0.24em]"
                  style={{ color: T.lime }}
                >
                  {sector.eyebrow}
                </p>
              )}

              {/* **`text-balance` para que ninguna línea se quede coja.**
                  Por debajo de 640 px las dos frases pueden partirse, y el
                  navegador parte donde deja de caber: "Llenar tu agenda es" y
                  debajo "fácil." sola. Una palabra suelta en su propio renglón
                  no es un titular, es un titular roto — y en un titular a este
                  tamaño se ve antes que se lee. */}
              <h1
                className="font-black leading-[0.94] tracking-[-0.035em] text-balance"
                style={{ fontSize: "clamp(2.75rem, 9.5cqw, 10rem)" }}
              >
                <span className="whitespace-nowrap max-sm:whitespace-normal">
                  {sector.titular.primera}
                </span>
                <br />
                <span
                  className="whitespace-nowrap max-sm:whitespace-normal"
                  style={{ color: T.lime }}
                >
                  {sector.titular.segunda}
                </span>
              </h1>

              {/* En blanco entero: el lima ya está en el titular, justo encima,
                  y repetirlo aquí hacía que las dos frases compitieran. Lo que
                  destaca "ganar más" es el trazo, no el color. */}
              <p
                className="mt-9 max-w-3xl font-bold leading-[1.3] tracking-[-0.015em] text-balance lg:mt-14"
                style={{ fontSize: "clamp(1.5rem, 2.6vw, 3.25rem)" }}
              >
                {sector.subtitulo.antes}
                <Subrayado>{sector.subtitulo.resaltado}</Subrayado>
                {sector.subtitulo.despues}
              </p>
            </div>

            <FormularioHero sectorPorDefecto={sector.valorFormulario} />
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
              {sector.tituloProblema}
            </h2>
          </AlAparecer>

          {/* Escalonadas: entrando a la vez se leen como un bloque, y lo que
              tienen que leerse es como una comparación — primero una y después
              la otra, que es el orden en que se entiende. */}
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {comparativa.map((c, i) => (
              <AlAparecer key={c.remate} retraso={i * 140} className="h-full">
                <div
                  className="h-full rounded-3xl p-7 md:p-9"
                  style={{
                    background: c.rodeado
                      ? `radial-gradient(120% 100% at 50% 0%, ${T.lime}14, ${T.ink} 60%)`
                      : T.ink,
                    border: `1px solid ${c.color}44`,
                  }}
                >
                  {/* El rótulo de la tarjeta ganadora lleva el logotipo en vez de
                      la palabra suelta: es lo que ata el número de abajo a un
                      nombre. Va en versión compacta para no romper el renglón —el
                      logotipo entero mete una segunda línea y deja de leerse como
                      parte de la frase. */}
                  <p
                    className="flex flex-wrap items-center gap-x-1.5 text-sm font-bold uppercase tracking-[0.18em]"
                    style={{ color: c.color }}
                  >
                    {c.conLogo ? (
                      <>
                        {sector.negocio} con <Logotipo compacto />
                      </>
                    ) : (
                      `${sector.negocio} sin escala`
                    )}
                  </p>

                  <div className="mt-7 space-y-4">
                    {[
                      { k: "Ticket medio", v: sector.ticket },
                      { k: `${enMayuscula(sector.termino.plural)} nuevos`, v: c.entran },
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

            {/* El subtítulo, y lo que de verdad se compra: no un sistema, sino
                dejar de ocuparse de esto.

                Estuvo suelto después de los tres pasos, de remate. Aquí funciona
                mejor por una razón que no es de maquetación: "todo lo demás" pide
                que le expliquen qué es, y justo debajo están los tres pasos
                diciéndolo. Antes cerraba; ahora abre. */}
            <p
              className="mt-8 font-bold leading-[1.2] tracking-[-0.015em] text-balance"
              style={{ fontSize: "clamp(1.375rem, 2.4vw, 2.25rem)" }}
            >
              Tú encárgate de darle un buen servicio a tus {sector.termino.plural}.{" "}
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
          capítulo nuevo. */}
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
          que tiene que quedarse. */}
      <section
        className="flex items-center py-20 md:py-24 lg:py-28"
        style={{ background: T.lime, color: T.ink }}
      >
        <Wrap>
          {/* **El hecho primero; el porqué, debajo.**

              Antes esto era una sola frase grande: "Vas a querer quedarte por
              los resultados, no porque te obliguemos". Se lee bien, pero hay
              que leerla ENTERA para saber qué te están diciendo, y en una
              página de venta lo que se escanea es lo grande. Lo que de verdad
              mata la objeción es el dato: no hay permanencia.

              **Alineado a la izquierda, como el resto de la página.** Esto pasó
              por dos versiones antes de volver aquí: primero se mandó el botón
              a la derecha para llenar el hueco —y quedó un botón solo, pegado
              al margen y a medio metro de la frase que lo justifica—, después
              se centró la columna entera, y centrado deja de leerse como las
              demás secciones. */}
          <AlAparecer>
            <div className="max-w-4xl">
              <div>
                <p
                  className="relative inline-block font-black leading-[1.02] tracking-[-0.035em]"
                  style={{ fontSize: "clamp(2.25rem, 6.4vw, 5rem)" }}
                >
                  Sin permanencia
                  <SubrayadoABoli />
                </p>

                {/* El corte va en la coma. Dejándoselo al navegador partía por
                    "los resultados", que no significa nada; en la coma se lee
                    en dos golpes que son sus dos mitades. Debajo de lg fluye
                    sola, porque ahí no hay ancho para elegir dónde romper. */}
                <p
                  className="mt-7 font-bold leading-[1.2] tracking-[-0.02em]"
                  style={{ fontSize: "clamp(1.375rem, 3.1vw, 2.5rem)" }}
                >
                  <span className="lg:block">Vas a querer quedarte por los resultados,</span>{" "}
                  <span className="lg:block">no porque te obliguemos.</span>
                </p>
              </div>

              {/* **WhatsApp y no otro formulario.** Aquí hubo un tiempo sin
                  botón, y el argumento era bueno: repetir la misma llamada a la
                  acción convierte el cierre en un anuncio. Lo que cambia es que
                  esto no repite nada — el formulario del hero pide un teléfono
                  para que llamemos nosotros, y hay bastante gente que no lo deja
                  pero sí escribe. Son dos puertas distintas para dos personas
                  distintas, no la misma dos veces. */}
              <div className="mt-10">
                <a
                  href={CONTACT_INFO.socials.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 rounded-full px-7 py-4 text-base font-bold transition-transform hover:-translate-y-0.5 sm:text-lg"
                  style={{ background: T.ink, color: T.fg }}
                >
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    className="h-5 w-5 shrink-0"
                    fill="currentColor"
                  >
                    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23a8.2 8.2 0 0 1 8.24 8.24c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.16 0-.43.06-.65.31-.22.25-.85.83-.85 2.03s.87 2.35.99 2.51c.12.17 1.71 2.61 4.15 3.66.58.25 1.03.4 1.39.51.58.19 1.11.16 1.53.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.11-.22-.17-.47-.29Z" />
                  </svg>
                  Escríbenos por WhatsApp
                </a>
              </div>
            </div>
          </AlAparecer>
        </Wrap>
      </section>

      {/* ───────── 6. Elegir hueco ─────────
          Entre el cierre emocional y la letra pequeña: quien ha llegado hasta
          aquí ya está convencido o casi, y es el momento en que tiene sentido
          ofrecerle zanjarlo él mismo sin esperar una llamada. */}
      <CalendarioReserva />

      {/* ───────── 7. Preguntas frecuentes ─────────
          Después de la frase del compromiso y no antes del precio. Quien llega
          hasta aquí ya ha visto la tabla y ya ha decidido si le encaja; lo que
          le queda es la desconfianza, y eso no se resuelve con más argumentos
          sino contestando la pregunta incómoda con su nombre.

          Vuelve al fondo oscuro a propósito: el bloque lima de arriba es el
          cierre emocional y tiene que quedarse como tal. */}
      <section
        className="relative overflow-hidden py-16 md:py-20 lg:py-24"
        style={{ background: T.surface }}
      >
        <Trama motivo="rayas" desde="20% 60%" />
        <Wrap className="relative">
          <AlAparecer>
            <Faqs extra={sector.preguntas} />
          </AlAparecer>
        </Wrap>
      </section>
    </>
  );
}
