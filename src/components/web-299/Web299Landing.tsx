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
 * La idea que la ordena: en vez de DESCRIBIR el producto, la página lo
 * DEMUESTRA. El hero monta una web sección a sección delante de quien mira, el
 * coste va en un tique sumado en vez de en tres tarjetas, y la anatomía de la
 * one page es la pieza central en lugar de una lista de «qué incluye». Una
 * landing de web que no enseña una web montándose está desaprovechando lo único
 * que tiene a mano.
 *
 * PALETA PROPIA, no los tokens del sitio: con tokens, las secciones sin fondo
 * explícito heredaban el modo oscuro del visitante mientras el texto seguía
 * fijado en claro, y media landing quedaba ilegible. Cada superficie declara su
 * fondo Y su color.
 *
 * El acento tiene dos variantes por CONTRASTE, no por gusto: el azul de marca
 * sobre la tinta se queda en 4.4, por debajo del mínimo para texto pequeño, y
 * sobre crema se queda flojo. Cada variante va en su fondo.
 */
const INK = "#0B1020";
const CREAM = "#FBF8F4";
const ACCENT = "#187bef";
/** Para texto sobre fondos CLAROS. */
const ACCENT_DEEP = "#0F5FBD";
/** Para texto sobre la tinta: sube el contraste de 4.4 a 7.3. */
const ACCENT_ON_DARK = "#7DB0F7";
/** Verde del tique: el único color fuera de la paleta, y solo para el total. */
const LIME = "#B9F05C";

/**
 * Animaciones locales, en un `<style>` del propio componente y con prefijo
 * `w299-`, no en `globals.css`: son de esta página y nada más, y meterlas en la
 * hoja global las cargaría en las otras cuarenta rutas del sitio.
 *
 * `prefers-reduced-motion` apaga el montaje y deja todos los bloques visibles:
 * quien pide menos movimiento tiene que ver la web entera igual, no una a
 * medias.
 */
const ANIMACIONES = `
@keyframes w299-montar {
  0%   { opacity: 0; transform: translateY(14px); }
  100% { opacity: 1; transform: translateY(0); }
}
.w299-bloque { opacity: 0; animation: w299-montar .55s cubic-bezier(.21,.47,.32,.98) forwards; }
@keyframes w299-cursor { 0%, 49% { opacity: 1 } 50%, 100% { opacity: 0 } }
.w299-cursor { animation: w299-cursor 1.1s step-end infinite; }
@media (prefers-reduced-motion: reduce) {
  .w299-bloque { opacity: 1; animation: none; }
  .w299-cursor { animation: none; }
}
`;

/**
 * La web montándose. Cada bloque entra con un retraso, así que se ve construir
 * una portada, luego los servicios, luego el resto — exactamente las seis
 * secciones que se venden. Son cajas de color, NO texto de pega: un «Lorem
 * ipsum» a este tamaño se lee como una web sin terminar, y las cajas se leen
 * como una maqueta.
 *
 * Plano y de frente, sin inclinación ni perspectiva.
 */
function WebMontandose() {
  const bloque = (delay: number, extra: string, style?: React.CSSProperties) => (
    <div className={`w299-bloque ${extra}`} style={{ animationDelay: `${delay}s`, ...style }} />
  );
  return (
    <div
      className="overflow-hidden rounded-2xl"
      style={{
        border: "1px solid rgba(255,255,255,.14)",
        background: "#fff",
        boxShadow: "0 30px 70px -40px rgba(0,0,0,.7)",
      }}
    >
      {/* Barra del navegador, puro CSS. */}
      <div
        className="flex items-center gap-1.5 px-4 py-3"
        style={{ background: "#F1EEE9", borderBottom: "1px solid rgba(11,16,32,.08)" }}
      >
        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: "#D9534F" }} />
        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: "#E8B33C" }} />
        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: "#4FA96A" }} />
        <span className="ml-2 flex h-5 flex-1 items-center rounded px-2 text-[10px]" style={{ background: "#fff", color: "#8A91A6" }}>
          tunegocio.es
          <span className="w299-cursor ml-0.5" aria-hidden="true">|</span>
        </span>
      </div>

      <div className="space-y-2.5 p-4" aria-hidden="true">
        {/* 01 Portada: titular + botón */}
        <div className="flex items-end gap-3">
          {bloque(0.15, "h-16 flex-1 rounded-lg", { background: "rgba(11,16,32,.85)" })}
          {bloque(0.3, "h-8 w-20 rounded-lg", { background: ACCENT })}
        </div>
        {/* 02 Servicios: tres tarjetas */}
        <div className="grid grid-cols-3 gap-2.5">
          {bloque(0.5, "h-14 rounded-lg", { background: "rgba(11,16,32,.10)" })}
          {bloque(0.6, "h-14 rounded-lg", { background: "rgba(11,16,32,.10)" })}
          {bloque(0.7, "h-14 rounded-lg", { background: "rgba(11,16,32,.10)" })}
        </div>
        {/* 03 Cómo trabajas */}
        {bloque(0.9, "h-10 rounded-lg", { background: "rgba(24,123,239,.14)" })}
        {/* 04 Precios + 05 Dónde estás */}
        <div className="grid grid-cols-[1.6fr_1fr] gap-2.5">
          {bloque(1.05, "h-12 rounded-lg", { background: "rgba(11,16,32,.10)" })}
          {bloque(1.15, "h-12 rounded-lg", { background: "rgba(11,16,32,.22)" })}
        </div>
        {/* 06 Contacto */}
        {bloque(1.35, "h-9 rounded-lg", { background: "rgba(11,16,32,.85)" })}
      </div>
    </div>
  );
}

/** Marco de navegador plano para las capturas reales. */
function Ventana({ src, alt }: { src: string; alt: string }) {
  return (
    <figure
      className="overflow-hidden rounded-2xl"
      style={{ border: "1px solid rgba(11,16,32,.12)", background: "#fff", boxShadow: "0 18px 40px -28px rgba(11,16,32,.45)" }}
    >
      <div
        className="flex items-center gap-1.5 px-4 py-3"
        style={{ background: "#F1EEE9", borderBottom: "1px solid rgba(11,16,32,.08)" }}
      >
        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: "#D9534F" }} />
        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: "#E8B33C" }} />
        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: "#4FA96A" }} />
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

/** Logos en movimiento. Doble juego, el segundo `aria-hidden`: así el bucle no
 *  tiene costura y un lector de pantalla no lee la lista dos veces. */
function TiraDeLogos() {
  const fila = (oculta: boolean) =>
    LOGOS.map((slug) => (
      <Image
        key={`${slug}-${oculta ? "b" : "a"}`}
        src={`/img/casos/${slug}/logo/negativo.${LOGO_EXT[slug] ?? "webp"}`}
        alt={oculta ? "" : slug.replace(/-/g, " ")}
        aria-hidden={oculta || undefined}
        width={150}
        height={48}
        className="h-7 w-auto shrink-0 opacity-70 sm:h-8"
      />
    ));
  return (
    <section className="relative" style={{ background: INK }}>
      <div className="py-8 pb-16">
        <p className="mb-6 text-center text-[12px] font-bold uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,.45)" }}>
          Ya trabajamos con
        </p>
        <div className="relative overflow-hidden">
          <div className="animate-marquee flex w-max items-center gap-12 pr-12">
            {fila(false)}
            {fila(true)}
          </div>
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-16" style={{ background: `linear-gradient(to right, ${INK}, transparent)` }} />
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-16" style={{ background: `linear-gradient(to left, ${INK}, transparent)` }} />
        </div>
      </div>
      <Cut to={CREAM} shape="valley" />
    </section>
  );
}

/** Corte curvo entre secciones. Va DENTRO de la sección anterior, absoluto
 *  sobre su fondo, para que no aparezca el escalón que dejaba un bloque
 *  intermedio con fondo propio. Los trazados rebasan el lienzo por los lados
 *  para que el borde antialiaseado quede fuera y no se vea la costura. */
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

      {/* HERO. El precio es el protagonista TIPOGRÁFICO: a este tamaño, la cifra
          es la ilustración, y no hace falta ningún asset para que la página
          tenga una imagen fuerte. El formulario sigue arriba y a la vista. */}
      <section className="relative overflow-hidden" style={{ background: INK, color: "#fff" }}>
        <div aria-hidden="true" className="pointer-events-none absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full opacity-25 blur-3xl" style={{ background: ACCENT }} />
        <Container className="relative py-14 md:py-20">
          <div className="grid items-start gap-12 lg:grid-cols-[1.15fr_minmax(350px,400px)]">
            <div>
              <p className="text-[13px] font-bold uppercase tracking-[0.14em]" style={{ color: ACCENT_ON_DARK }}>
                Una página. Seis secciones. Un pago.
              </p>

              <h1 className="mt-5 text-[40px] font-extrabold leading-[0.95] tracking-tight sm:text-[58px]">
                Tu web hecha
                <br />
                por{" "}
                {/* La cifra, enorme y con el símbolo pequeño: así el número
                    manda y no compite con el euro. */}
                <span className="whitespace-nowrap">
                  <span style={{ color: LIME }}>299</span>
                  <span className="text-[0.5em] align-super font-bold" style={{ color: LIME }}>€</span>
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-[17px] leading-relaxed sm:text-[19px]" style={{ color: "rgba(255,255,255,.82)" }}>
                Una sola página de las que se recorren haciendo scroll, con tus colores, tus textos y
                tus fotos. Pago único: no hay cuota mensual por la web.
              </p>

              {/* La web montándose: demuestra el producto en el sitio donde
                  normalmente va una lista de tres ventajas. */}
              <div className="mt-9 max-w-lg">
                <WebMontandose />
                <p className="mt-3 text-[13px]" style={{ color: "rgba(255,255,255,.55)" }}>
                  Así se monta: portada, servicios, cómo trabajas, precios, dónde estás y contacto.
                </p>
              </div>
            </div>

            <div className="lg:sticky lg:top-24">
              <Web299Form ubicacion="hero" />
            </div>
          </div>
        </Container>
      </section>

      <TiraDeLogos />

      {/* EL TIQUE. Sustituye a las tres tarjetas de precio, y es la sección que
          más se va a recordar: es la suma que todo el mundo hace a mano y que
          nadie pone. Decirla nosotros quita la sospecha de que hay algo
          escondido, y el número del segundo año es el argumento de verdad
          frente a una cuota mensual. */}
      <section className="relative" style={{ background: CREAM }}>
        <Container className="py-16 md:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_minmax(320px,440px)]">
            <div>
              <h2 className="text-[32px] font-extrabold leading-[1.05] tracking-tight sm:text-[44px]">
                Lo que cuesta,
                <br />
                <span style={{ color: ACCENT_DEEP }}>sumado</span>
              </h2>
              <p className="mt-5 max-w-lg text-[17px] leading-relaxed" style={{ color: "#3E4557" }}>
                Nadie pone esta cuenta, así que la ponemos nosotros. El alojamiento y el dominio no
                van incluidos y son anuales: puedes contratarlos con quien quieras, y si te apetece
                nos encargamos por ese precio.
              </p>
              <p className="mt-6 text-[15px] leading-relaxed" style={{ color: "#5A6178" }}>
                A partir del segundo año solo pagas el alojamiento y el dominio:{" "}
                <strong style={{ color: INK }}>{WEB_299_TOTAL_SIGUIENTES} al año</strong>. Eso es lo
                que cuesta tenerla viva, no una cuota mensual.
              </p>
            </div>

            {/* El tique. Tipografía monoespaciada y borde dentado abajo: se lee
                como un recibo, que es justo lo que se quiere transmitir. */}
            <div
              className="relative rounded-2xl p-7 font-mono"
              style={{ background: INK, color: "#fff", boxShadow: "0 26px 60px -30px rgba(11,16,32,.65)" }}
            >
              <p className="text-[12px] font-bold uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,.5)" }}>
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
                      <span className="ml-2 text-[12px]" style={{ color: "rgba(255,255,255,.45)" }}>
                        {l.nota}
                      </span>
                    </dt>
                    {/* Línea de puntos: es lo que hace que se lea como un tique
                        y no como una tabla. */}
                    <span aria-hidden="true" className="mx-2 flex-1 self-end border-b border-dashed" style={{ borderColor: "rgba(255,255,255,.22)" }} />
                    <dd className="font-bold tabular-nums">{l.v}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-7 border-t border-dashed pt-6" style={{ borderColor: "rgba(255,255,255,.25)" }}>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-[13px] font-bold uppercase tracking-[0.12em]" style={{ color: "rgba(255,255,255,.6)" }}>
                    Total
                  </span>
                  <span className="text-[40px] font-extrabold leading-none tabular-nums tracking-tight" style={{ color: LIME }}>
                    {WEB_299_TOTAL_PRIMER_ANO}
                  </span>
                </div>
              </div>

              {/* Dentado del recibo. Círculos del color de la sección de abajo,
                  medio fuera, que es cómo se recorta un borde rasgado sin
                  imagen. */}
              <div aria-hidden="true" className="absolute inset-x-0 -bottom-2 flex justify-between px-3">
                {Array.from({ length: 16 }).map((_, i) => (
                  <span key={i} className="h-4 w-4 rounded-full" style={{ background: CREAM }} />
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* LA ANATOMÍA. Sustituye a la lista de «qué incluye»: enseña las seis
          secciones numeradas, que es la pregunta que de verdad se hace quien
          compara 299€ con un presupuesto de 2.000€. */}
      <section className="relative overflow-hidden" style={{ background: INK, color: "#fff" }}>
        <Container className="py-16 md:py-24">
          <div className="max-w-2xl">
            <h2 className="text-[32px] font-extrabold leading-[1.05] tracking-tight sm:text-[44px]">
              Qué lleva dentro,
              <br />
              <span style={{ color: ACCENT_ON_DARK }}>sección por sección</span>
            </h2>
            <p className="mt-5 text-[17px] leading-relaxed" style={{ color: "rgba(255,255,255,.8)" }}>
              Una sola página con menú que salta a cada bloque. Es el formato que mejor funciona
              cuando lo que quieres es que te llamen o te escriban.
            </p>
          </div>

          <ol className="mt-12 grid gap-px overflow-hidden rounded-2xl sm:grid-cols-2 lg:grid-cols-3" style={{ background: "rgba(255,255,255,.12)" }}>
            {WEB_299_SECCIONES.map((sec, i) => (
              <Reveal key={sec.n} delay={i * 0.06}>
                <li className="h-full p-7" style={{ background: INK }}>
                  <p className="text-[40px] font-extrabold leading-none tabular-nums tracking-tight" style={{ color: "rgba(125,176,247,.32)" }}>
                    {sec.n}
                  </p>
                  <p className="mt-3 text-[19px] font-bold">{sec.titulo}</p>
                  <p className="mt-2 text-[15px] leading-relaxed" style={{ color: "rgba(255,255,255,.78)" }}>
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
                style={{ background: "rgba(125,176,247,.12)", color: "rgba(255,255,255,.9)", border: "1px solid rgba(125,176,247,.22)" }}
              >
                {i}
              </span>
            ))}
          </div>

          {/* El «qué no incluye» va AQUÍ, pegado al «qué sí», y con el mismo
              peso. Separarlo en otra sección es lo que hace que parezca que se
              esconde, y es la conversación incómoda que acaba en la llamada. */}
          <div className="mt-12 rounded-2xl p-7" style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.12)" }}>
            <p className="text-[13px] font-bold uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,.55)" }}>
              Lo que no entra
            </p>
            <ul className="mt-4 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
              {WEB_299_EXCLUDES.map((e) => (
                <li key={e} className="flex items-start gap-2.5 text-[15px] leading-relaxed" style={{ color: "rgba(255,255,255,.78)" }}>
                  <span aria-hidden="true" style={{ color: "rgba(255,255,255,.35)" }}>
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
            <span style={{ color: ACCENT_DEEP }}>publicadas</span>
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

      {/* PASOS, como una línea de tiempo horizontal con cifras enormes. */}
      <section className="relative" style={{ background: CREAM }}>
        <Container className="pb-16 md:pb-24">
          <div className="grid gap-10 md:grid-cols-3 md:gap-6">
            {WEB_299_STEPS.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.1}>
                <div className="border-t-2 pt-6" style={{ borderColor: i === 0 ? ACCENT : "rgba(11,16,32,.14)" }}>
                  <p className="text-[13px] font-bold uppercase tracking-[0.14em]" style={{ color: ACCENT_DEEP }}>
                    Paso {i + 1}
                  </p>
                  <p className="mt-3 text-[21px] font-extrabold leading-tight">{s.title}</p>
                  <p className="mt-2 text-[15px] leading-relaxed" style={{ color: "#3E4557" }}>
                    {s.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* FAQS, en lista grande en vez de acordeón de tarjetas. */}
      <section className="relative" style={{ background: CREAM }}>
        <Container className="pb-16 md:pb-24">
          <h2 className="text-[32px] font-extrabold leading-[1.05] tracking-tight sm:text-[44px]">
            Dudas razonables
          </h2>
          <div className="mt-10 border-t" style={{ borderColor: "rgba(11,16,32,.14)" }}>
            {WEB_299_FAQS.map((f) => (
              <details key={f.q} className="group border-b py-5" style={{ borderColor: "rgba(11,16,32,.14)" }}>
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-[18px] font-bold sm:text-[20px]">
                  <span>{f.q}</span>
                  <span aria-hidden="true" className="mt-1 shrink-0 text-[22px] leading-none transition-transform group-open:rotate-45" style={{ color: ACCENT_DEEP }}>
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
      <section className="relative overflow-hidden" style={{ background: INK, color: "#fff" }}>
        <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-28 h-[26rem] w-[26rem] rounded-full opacity-20 blur-3xl" style={{ background: ACCENT }} />
        <Container className="relative py-16 md:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_minmax(350px,400px)]">
            <div>
              <h2 className="text-[32px] font-extrabold leading-[1.02] tracking-tight sm:text-[46px]">
                ¿Empezamos?
              </h2>
              <p className="mt-5 max-w-lg text-[17px] leading-relaxed" style={{ color: "rgba(255,255,255,.82)" }}>
                Tu nombre, tu teléfono y tu correo. Te llamamos en menos de 24 horas, te damos fecha
                y decides. En {WEB_299_DAYS} días laborables la puedes tener publicada.
              </p>
              <p className="mt-8 text-[14px]" style={{ color: "rgba(255,255,255,.6)" }}>
                Consulta las{" "}
                <a href={WEB_299_TERMS_PATH} className="underline" style={{ color: ACCENT_ON_DARK }}>
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
