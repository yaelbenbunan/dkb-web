import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { Web299Form } from "./Web299Form";
import {
  WEB_299_DAYS,
  WEB_299_DOMAIN,
  WEB_299_EXCLUDES,
  WEB_299_FAQS,
  WEB_299_HOSTING,
  WEB_299_INCLUDES,
  WEB_299_PRICE,
  WEB_299_SECCIONES,
  WEB_299_STEPS,
  WEB_299_TERMS_PATH,
  WEB_299_TOTAL_PRIMER_ANO,
  WEB_299_TOTAL_SIGUIENTES,
} from "@/lib/web-299";

/**
 * Landing de la web a 299€.
 *
 * PALETA: negros para las superficies oscuras y el azul de dinkbit (#0b3ae7)
 * SOLO como relleno —botones, hitos, subrayados— nunca como texto pequeño sobre
 * negro. Está medido: el azul de marca como texto sobre este negro da 2.5:1,
 * ilegible; como fondo con blanco encima da 8.4:1, y como texto sobre la crema
 * 7.15:1. O sea que el azul manda en los sitios donde se pulsa, y el texto sobre
 * negro va en blanco.
 *
 * Los colores son FIJOS, no tokens del tema: con tokens, las secciones sin fondo
 * explícito heredaban el modo oscuro del visitante mientras el texto seguía
 * fijado en claro, y media landing quedaba ilegible. Cada superficie declara su
 * fondo Y su color.
 */
const NEGRO = "#0B0B0E";
/** Segunda superficie oscura, para que dos secciones seguidas no se confundan. */
const NEGRO_SUAVE = "#15151B";
const CREAM = "#FBF8F4";
/** El azul de dinkbit. Relleno y texto sobre claro; nunca texto sobre negro. */
const AZUL = "#0b3ae7";
const INK = "#0B1020";

/**
 * Animaciones locales, con prefijo `w299-` y en un `<style>` del propio
 * componente: son de esta página, y meterlas en `globals.css` las cargaría en
 * las otras cuarenta rutas del sitio.
 */
const ANIMACIONES = `
@keyframes w299-linea { from { transform: scaleX(0) } to { transform: scaleX(1) } }
.w299-linea { transform-origin: left center; animation: w299-linea 1.1s .15s cubic-bezier(.21,.47,.32,.98) both; }
@keyframes w299-latido {
  0%, 100% { box-shadow: 0 0 0 0 rgba(11,58,231,.6) }
  70%      { box-shadow: 0 0 0 12px rgba(11,58,231,0) }
}
.w299-latido { animation: w299-latido 2.4s ease-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .w299-linea { transform: scaleX(1); animation: none; }
  .w299-latido { animation: none; }
}
`;

/** Marco de navegador plano y de frente para las capturas reales. */
function Ventana({ src, alt }: { src: string; alt: string }) {
  return (
    <figure
      className="overflow-hidden rounded-2xl"
      style={{ border: "1px solid rgba(11,16,32,.12)", background: "#fff", boxShadow: "0 18px 40px -28px rgba(11,16,32,.45)" }}
    >
      <div className="flex items-center gap-1.5 px-4 py-3" style={{ background: "#F1EEE9", borderBottom: "1px solid rgba(11,16,32,.08)" }}>
        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: "rgba(11,16,32,.22)" }} />
        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: "rgba(11,16,32,.16)" }} />
        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: "rgba(11,16,32,.10)" }} />
        <span aria-hidden="true" className="ml-2 h-4 flex-1 rounded" style={{ background: "rgba(11,16,32,.06)" }} />
      </div>
      <Image src={src} alt={alt} width={800} height={600} className="h-auto w-full" sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" />
    </figure>
  );
}

const MUESTRAS = [
  { src: "/img/casos/benbunan-clinica-dental/desarrollo-web/01.webp", alt: "Web de Benbunan Clínica Dental" },
  { src: "/img/casos/marina-padel/desarrollo-web/01.png", alt: "Web de Marina Pádel" },
  { src: "/img/casos/viso-psicologos/desarrollo-web/01.png", alt: "Web de Viso Psicólogos" },
  { src: "/img/casos/reformas-servilucas/desarrollo-web/01-desktop.webp", alt: "Web de Reformas Servilucas" },
  { src: "/img/casos/phoenix-dental/desarrollo-web/01-desktop.webp", alt: "Web de Phoenix Dental" },
  { src: "/img/casos/yebenes/desarrollo-web/01.png", alt: "Web de Yébenes" },
] as const;

const LOGOS = [
  "adeslas", "benbunan-clinica-dental", "marina-padel", "viso-psicologos",
  "reformas-servilucas", "phoenix-dental", "yebenes", "urolf",
  "instituto-fich", "suites-alicante-plaza", "tectonica-design", "silbo",
] as const;

const LOGO_EXT: Record<string, string> = {
  "marina-padel": "png",
  "viso-psicologos": "png",
  yebenes: "png",
  "instituto-fich": "png",
};

/**
 * Logos de clientes en movimiento.
 *
 * TRES COSAS que hacían que no se vieran, y las tres medidas sobre los ficheros
 * de verdad, no supuestas:
 *
 * 1. Los ficheros son 358x287 —casi cuadrados—, y aquí se declaraban 320x110.
 *    Next usa esa proporción para reservar el hueco, así que cada logo caía en
 *    una caja de 140x48 y se renderizaba aplastado.
 * 2. El lienzo lleva mucho margen transparente: la marca de Adeslas ocupa el 46%
 *    del alto. Con una caja de 48px, el logo que se veía medía 22px. De ahí que
 *    parecieran minúsculos aunque la caja fuera «grande».
 * 3. `loading="lazy"` en una tira que se mueve sola: los que empiezan fuera del
 *    viewport no se cargaban a tiempo y dejaban huecos en blanco.
 *
 * Los `negativo` son blancos (luminancia media 254/255), así que sobre el negro
 * se ven solos y no hace falta el filtro `.client-logo-bw`, que además depende
 * del tema del visitante y aquí el fondo es fijo.
 *
 * Doble juego de logos y `aria-hidden` en el segundo: así el bucle no tiene
 * costura y un lector de pantalla no lee la lista dos veces.
 */
function TiraDeLogos() {
  const fila = (oculta: boolean) =>
    LOGOS.map((slug) => (
      <Image
        key={`${slug}-${oculta ? "b" : "a"}`}
        src={`/img/casos/${slug}/logo/negativo.${LOGO_EXT[slug] ?? "webp"}`}
        alt={oculta ? "" : slug.replace(/-/g, " ")}
        aria-hidden={oculta || undefined}
        width={358}
        height={287}
        loading="eager"
        className="h-20 w-auto shrink-0 object-contain sm:h-24 lg:h-28"
      />
    ));
  return (
    <section className="relative" style={{ background: NEGRO_SUAVE }}>
      <div className="py-12 pb-20">
        <p className="mb-9 text-center text-[13px] font-bold uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,.6)" }}>
          Ya trabajamos con
        </p>
        <div className="relative overflow-hidden">
          <div className="animate-marquee flex w-max items-center gap-16 pr-16 lg:gap-20 lg:pr-20">
            {fila(false)}
            {fila(true)}
          </div>
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-20" style={{ background: `linear-gradient(to right, ${NEGRO_SUAVE}, transparent)` }} />
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-20" style={{ background: `linear-gradient(to left, ${NEGRO_SUAVE}, transparent)` }} />
        </div>
      </div>
      <Cut to={CREAM} shape="valley" />
    </section>
  );
}

/** Corte curvo entre secciones. Va DENTRO de la sección anterior, absoluto sobre
 *  su fondo, para que no aparezca el escalón que dejaba un bloque intermedio con
 *  fondo propio. Los trazados rebasan el lienzo por los lados para que el borde
 *  antialiaseado quede fuera y no se vea la costura de un píxel. */
function Cut({ to, shape = "valley", height = 90 }: { to: string; shape?: "valley" | "wave" | "crest"; height?: number }) {
  const paths = {
    valley: "M-1,7 L-1,1.5 Q50,7.5 101,1.5 L101,7 Z",
    wave: "M-1,7 L-1,3.4 C22,-0.6 40,6.2 58,2.8 C76,-0.4 89,3.4 101,1.8 L101,7 Z",
    crest: "M-1,7 L-1,4.5 Q50,-1.5 101,4.5 L101,7 Z",
  } as const;
  return (
    <svg aria-hidden="true" viewBox="0 0 100 6" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 w-full" style={{ display: "block", height, marginBottom: -1 }}>
      <path d={paths[shape]} fill={to} />
    </svg>
  );
}

export function Web299LandingPage() {
  return (
    <div style={{ background: CREAM, color: INK }}>
      <style>{ANIMACIONES}</style>

      {/* HERO con FOTO de fondo.
          El degradado no es decorativo: cae de .94 a .55 de izquierda a derecha,
          o sea opaco justo donde va el texto y más claro donde va el formulario,
          que es una tarjeta blanca y se defiende sola. Encima, `text-shadow` en
          el titular. Texto sobre foto sin esas dos cosas es el fallo de
          legibilidad que ya costó una corrección en /imagina-tu-web: la foto
          cambia de tono por zonas y el contraste medido sobre un color plano no
          garantiza nada. */}
      <section className="relative isolate overflow-hidden" style={{ background: NEGRO, color: "#fff" }}>
        <Image
          src="/img/home/hero-bg-alt-meeting.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-20 object-cover object-center"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(100deg, rgba(11,11,14,.95) 0%, rgba(11,11,14,.90) 42%, rgba(11,11,14,.62) 78%, rgba(11,11,14,.52) 100%)",
          }}
        />

        <Container className="relative py-16 md:py-24">
          <div className="grid items-start gap-12 lg:grid-cols-[1.1fr_minmax(350px,400px)]">
            <div>
              <p className="text-[13px] font-bold uppercase tracking-[0.16em]" style={{ color: "rgba(255,255,255,.75)" }}>
                Una página. Seis secciones. Un pago.
              </p>

              <h1
                className="mt-5 text-[34px] font-extrabold leading-[1.02] tracking-tight sm:text-[48px]"
                style={{ textShadow: "0 2px 14px rgba(0,0,0,.55)" }}
              >
                Tu web optimizada para
                <br />
                convertir visitantes
                <br />
                en clientes{" "}
                <span className="whitespace-nowrap">
                  desde solo{" "}
                  {/* La cifra, a cuerpo mayor dentro de la frase y subrayada en
                      azul: el azul de marca como RELLENO, que es donde se lee. */}
                  <span
                    className="relative inline-block"
                    style={{ boxShadow: `inset 0 -0.26em 0 ${AZUL}` }}
                  >
                    <span className="relative text-[1.3em] leading-none">299</span>
                    <span className="relative text-[0.6em] align-super font-bold">€</span>
                  </span>
                </span>
              </h1>

              <p
                className="mt-7 max-w-xl text-[17px] leading-relaxed sm:text-[19px]"
                style={{ color: "rgba(255,255,255,.9)", textShadow: "0 1px 10px rgba(0,0,0,.5)" }}
              >
                Una sola página de las que se recorren haciendo scroll, con tus colores, tus textos y
                tus fotos. Pago único: no hay cuota mensual por la web.
              </p>

              <p className="mt-8 text-[15px] font-semibold" style={{ color: "rgba(255,255,255,.8)" }}>
                Publicada en {WEB_299_DAYS} días laborables · Alojamiento y dominio aparte
              </p>
            </div>

            <div className="lg:sticky lg:top-24">
              <Web299Form ubicacion="hero" />
            </div>
          </div>
        </Container>
      </section>

      <TiraDeLogos />

      {/* EL TIQUE. Sustituye a tres tarjetas de precio: es la suma que todo el
          mundo hace a mano y que ninguna competencia pone, y decirla nosotros
          quita la sospecha de que hay algo escondido. */}
      <section className="relative" style={{ background: CREAM }}>
        <Container className="py-16 md:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_minmax(320px,440px)]">
            <div>
              <h2 className="text-[32px] font-extrabold leading-[1.05] tracking-tight sm:text-[44px]">
                Sin sorpresas:
                <br />
                <span style={{ color: AZUL }}>esto es todo lo que pagas</span>
              </h2>
              <p className="mt-5 max-w-lg text-[17px] leading-relaxed" style={{ color: "#3E4557" }}>
                El alojamiento y el dominio no van incluidos y son anuales. Puedes contratarlos con
                quien quieras, y si te apetece nos encargamos nosotros por ese precio.
              </p>
              <p className="mt-6 text-[15px] leading-relaxed" style={{ color: "#5A6178" }}>
                A partir del segundo año solo pagas alojamiento y dominio:{" "}
                <strong style={{ color: INK }}>{WEB_299_TOTAL_SIGUIENTES} al año</strong>. Eso es lo
                que cuesta tenerla viva, y no una cuota mensual.
              </p>
            </div>

            {/* El tique: monoespaciada, línea de puntos y dentado abajo. Se lee
                como un recibo, que es justo lo que se quiere transmitir. */}
            <div className="relative rounded-2xl p-7 font-mono" style={{ background: NEGRO, color: "#fff", boxShadow: "0 26px 60px -30px rgba(11,11,14,.6)" }}>
              <p className="text-[12px] font-bold uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,.55)" }}>
                Primer año
              </p>
              <dl className="mt-6 space-y-4 text-[15px]">
                {[
                  { k: "Tu página web", v: WEB_299_PRICE, nota: "pago único" },
                  { k: "Alojamiento", v: WEB_299_HOSTING, nota: "al año" },
                  { k: "Dominio", v: WEB_299_DOMAIN, nota: "al año" },
                ].map((l) => (
                  <div key={l.k} className="flex items-baseline justify-between gap-4">
                    <dt>
                      {l.k}
                      <span className="ml-2 text-[12px]" style={{ color: "rgba(255,255,255,.55)" }}>
                        {l.nota}
                      </span>
                    </dt>
                    <span aria-hidden="true" className="mx-2 flex-1 self-end border-b border-dashed" style={{ borderColor: "rgba(255,255,255,.25)" }} />
                    <dd className="font-bold tabular-nums">{l.v}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-7 border-t border-dashed pt-6" style={{ borderColor: "rgba(255,255,255,.28)" }}>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-[13px] font-bold uppercase tracking-[0.12em]" style={{ color: "rgba(255,255,255,.65)" }}>
                    Total
                  </span>
                  {/* El total en blanco, no en azul: azul sobre negro no se lee.
                      El azul va en la banda de debajo, como relleno. */}
                  <span className="text-[40px] font-extrabold leading-none tabular-nums tracking-tight">
                    {WEB_299_TOTAL_PRIMER_ANO}
                  </span>
                </div>
              </div>

              <div className="-mx-7 mt-6 px-7 py-2.5" style={{ background: AZUL }}>
                <p className="text-center text-[13px] font-bold tracking-wide">Pago único por la web</p>
              </div>

              {/* Dentado del recibo: círculos del color de la sección de abajo,
                  medio fuera, que es cómo se recorta un borde rasgado sin imagen. */}
              <div aria-hidden="true" className="absolute inset-x-0 -bottom-2 flex justify-between px-3">
                {Array.from({ length: 16 }).map((_, i) => (
                  <span key={i} className="h-4 w-4 rounded-full" style={{ background: CREAM }} />
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* LA ANATOMÍA: las seis secciones, numeradas. Responde sin que nadie
          pregunte a «¿cuántas páginas son?». */}
      <section className="relative overflow-hidden" style={{ background: NEGRO, color: "#fff" }}>
        <Container className="py-16 md:py-24">
          <div className="max-w-2xl">
            <h2 className="text-[32px] font-extrabold leading-[1.05] tracking-tight sm:text-[44px]">
              Qué lleva dentro,
              <br />
              <span className="inline-block" style={{ boxShadow: `inset 0 -0.2em 0 ${AZUL}` }}>
                sección por sección
              </span>
            </h2>
            <p className="mt-6 text-[17px] leading-relaxed" style={{ color: "rgba(255,255,255,.85)" }}>
              Una sola página con menú que salta a cada bloque. Es el formato que mejor funciona
              cuando lo que quieres es que te llamen o te escriban.
            </p>
          </div>

          <ol className="mt-12 grid gap-px overflow-hidden rounded-2xl sm:grid-cols-2 lg:grid-cols-3" style={{ background: "rgba(255,255,255,.14)" }}>
            {WEB_299_SECCIONES.map((sec, i) => (
              <Reveal key={sec.n} delay={i * 0.06}>
                <li className="h-full p-7" style={{ background: NEGRO }}>
                  <p className="text-[40px] font-extrabold leading-none tabular-nums tracking-tight" style={{ color: "rgba(255,255,255,.3)" }}>
                    {sec.n}
                  </p>
                  <p className="mt-3 text-[19px] font-bold">{sec.titulo}</p>
                  <p className="mt-2 text-[15px] leading-relaxed" style={{ color: "rgba(255,255,255,.8)" }}>
                    {sec.que}
                  </p>
                </li>
              </Reveal>
            ))}
          </ol>

          <div className="mt-10 flex flex-wrap gap-2.5">
            {WEB_299_INCLUDES.map((i) => (
              <span
                key={i}
                className="rounded-full px-4 py-2 text-[14px]"
                style={{ background: "rgba(255,255,255,.08)", color: "rgba(255,255,255,.92)", border: "1px solid rgba(255,255,255,.18)" }}
              >
                {i}
              </span>
            ))}
          </div>

          {/* El «qué no incluye» va pegado al «qué sí» y con el mismo peso:
              separarlo en otra sección es lo que hace que parezca que se esconde,
              y es la conversación incómoda que acaba en la llamada. */}
          <div className="mt-10 rounded-2xl p-7" style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.14)" }}>
            <p className="text-[13px] font-bold uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,.6)" }}>
              Lo que no entra
            </p>
            <ul className="mt-4 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
              {WEB_299_EXCLUDES.map((e) => (
                <li key={e} className="flex items-start gap-2.5 text-[15px] leading-relaxed" style={{ color: "rgba(255,255,255,.8)" }}>
                  <span aria-hidden="true" style={{ color: "rgba(255,255,255,.4)" }}>
                    —
                  </span>
                  <span>{e}</span>
                </li>
              ))}
            </ul>
          </div>
        </Container>
        <Cut to={CREAM} shape="wave" />
      </section>

      {/* MUESTRAS */}
      <section className="relative" style={{ background: CREAM }}>
        <Container className="py-16 md:py-24">
          <h2 className="max-w-2xl text-[32px] font-extrabold leading-[1.05] tracking-tight sm:text-[44px]">
            Webs que ya están
            <br />
            <span style={{ color: AZUL }}>publicadas</span>
          </h2>
          <p className="mt-5 max-w-lg text-[17px] leading-relaxed" style={{ color: "#3E4557" }}>
            Trabajos reales de negocios como el tuyo. Ninguna es una maqueta.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {MUESTRAS.map((m, i) => (
              <Reveal key={m.src} delay={i * 0.07} scale>
                <Ventana src={m.src} alt={m.alt} />
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* LA CRONOLOGÍA: cuenta CUÁNDO, no solo qué. «Cómo funciona» es la
          pregunta de la agencia; «cuándo la tengo» es la del cliente. */}
      <section className="relative" style={{ background: CREAM }}>
        <Container className="pb-16 md:pb-24">
          <h2 className="max-w-2xl text-[32px] font-extrabold leading-[1.05] tracking-tight sm:text-[44px]">
            De hoy a publicada,
            <br />
            <span style={{ color: AZUL }}>en {WEB_299_DAYS} días</span>
          </h2>

          <div className="relative mt-14">
            <div
              aria-hidden="true"
              className="w299-linea absolute left-0 right-0 top-[11px] hidden h-[2px] md:block"
              style={{ background: `linear-gradient(to right, ${AZUL}, rgba(11,58,231,.18))` }}
            />
            <ol className="relative grid gap-10 md:grid-cols-3 md:gap-8">
              {WEB_299_STEPS.map((paso, i) => {
                const ultimo = i === WEB_299_STEPS.length - 1;
                return (
                  <Reveal key={paso.title} delay={0.25 + i * 0.16}>
                    <li className="relative pl-10 md:pl-0">
                      <span
                        aria-hidden="true"
                        className={`absolute left-0 top-[3px] grid h-6 w-6 place-items-center rounded-full md:static md:mb-6 ${ultimo ? "w299-latido" : ""}`}
                        style={{ background: ultimo || i === 0 ? AZUL : CREAM, border: `2px solid ${AZUL}` }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: ultimo || i === 0 ? "#fff" : AZUL }} />
                      </span>
                      <p className="text-[13px] font-bold uppercase tracking-[0.16em]" style={{ color: AZUL }}>
                        {paso.dia}
                      </p>
                      <p className="mt-2 text-[22px] font-extrabold leading-tight sm:text-[24px]">{paso.title}</p>
                      <p className="mt-2.5 max-w-sm text-[15px] leading-relaxed" style={{ color: "#3E4557" }}>
                        {paso.description}
                      </p>
                    </li>
                  </Reveal>
                );
              })}
            </ol>
          </div>
        </Container>
      </section>

      {/* FAQS en lista grande, con «+» que gira al abrir. */}
      <section className="relative" style={{ background: CREAM }}>
        <Container className="pb-16 md:pb-24">
          <h2 className="text-[32px] font-extrabold leading-[1.05] tracking-tight sm:text-[44px]">Dudas razonables</h2>
          <div className="mt-10 border-t" style={{ borderColor: "rgba(11,16,32,.14)" }}>
            {WEB_299_FAQS.map((f) => (
              <details key={f.q} className="group border-b py-5" style={{ borderColor: "rgba(11,16,32,.14)" }}>
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-[18px] font-bold sm:text-[20px]">
                  <span>{f.q}</span>
                  <span aria-hidden="true" className="mt-1 shrink-0 text-[22px] leading-none transition-transform group-open:rotate-45" style={{ color: AZUL }}>
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-2xl text-[16px] leading-relaxed" style={{ color: "#3E4557" }}>
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      {/* CIERRE */}
      <section className="relative overflow-hidden" style={{ background: NEGRO, color: "#fff" }}>
        <Container className="relative py-16 md:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_minmax(350px,400px)]">
            <div>
              <h2 className="text-[32px] font-extrabold leading-[1.02] tracking-tight sm:text-[46px]">¿Empezamos?</h2>
              <p className="mt-6 max-w-lg text-[17px] leading-relaxed" style={{ color: "rgba(255,255,255,.85)" }}>
                Tu nombre, tu teléfono y tu correo. Te llamamos en menos de 24 horas, te damos fecha
                y decides. En {WEB_299_DAYS} días laborables la puedes tener publicada.
              </p>
              <p className="mt-8 text-[14px]" style={{ color: "rgba(255,255,255,.65)" }}>
                Consulta las{" "}
                <a href={WEB_299_TERMS_PATH} className="underline" style={{ color: "#fff" }}>
                  condiciones del servicio
                </a>
                .
              </p>
            </div>
            <Web299Form ubicacion="cierre" />
          </div>
        </Container>
      </section>
    </div>
  );
}
