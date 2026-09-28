import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { Web299Form } from "./Web299Form";
import {
  WEB_299_DAYS,
  WEB_299_EXCLUDES,
  WEB_299_FAQS,
  WEB_299_HERO_BULLETS,
  WEB_299_INCLUDES,
  WEB_299_PRICE,
  WEB_299_PRICING,
  WEB_299_STEPS,
  WEB_299_TERMS_PATH,
} from "@/lib/web-299";

/**
 * Landing de captación de la web a 299€.
 *
 * PALETA PROPIA, no los tokens del sitio, por la misma razón que la landing de
 * web express: con tokens, las secciones sin fondo explícito heredaban el modo
 * oscuro del visitante mientras el texto seguía fijado en claro, y media landing
 * quedaba ilegible. Aquí cada superficie declara su fondo Y su color, así que se
 * ve igual venga de donde venga el clic.
 *
 * El acento tiene dos variantes por contraste y no es cosmético: el azul de
 * marca sobre la tinta se queda en 4.4, por debajo del mínimo para texto
 * pequeño, y sobre crema se queda flojo. Cada variante va en su fondo.
 */
const INK = "#0B1020";
const CREAM = "#FBF8F4";
const ACCENT = "#187bef";
/** Para texto sobre fondos CLAROS: el acento a secas se queda justo. */
const ACCENT_DEEP = "#0F5FBD";
/** Para texto sobre la tinta: sube el contraste de 4.4 a 7.3. */
const ACCENT_ON_DARK = "#7DB0F7";

/**
 * Corte curvo entre secciones, copiado del patrón de la landing de web express
 * (mismo lenguaje visual, producto distinto). Va DENTRO de la sección anterior,
 * absoluto sobre su fondo, para que no aparezca el escalón que dejaba un bloque
 * intermedio con fondo propio. Los trazados rebasan el lienzo por los lados para
 * que el borde antialiaseado caiga fuera y no se vea la costura de un píxel.
 *
 * Duplicado a propósito en vez de extraído a un componente compartido: sacarlo
 * de `WebExpressLanding.tsx` obligaría a tocar un fichero que sirve a tres
 * landings vivas de tráfico de pago, y son treinta líneas presentacionales.
 */
function Cut({ to, shape = "valley", height = 90 }: { to: string; shape?: "valley" | "wave" | "crest"; height?: number }) {
  const paths = {
    valley: "M-1,7 L-1,1.5 Q50,7.5 101,1.5 L101,7 Z",
    wave: "M-1,7 L-1,3.4 C22,-0.6 40,6.2 58,2.8 C76,-0.4 89,3.4 101,1.8 L101,7 Z",
    crest: "M-1,7 L-1,4.5 Q50,-1.5 101,4.5 L101,7 Z",
  } as const;
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 6"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 bottom-0 w-full"
      style={{ display: "block", height, marginBottom: -1 }}
    >
      <path d={paths[shape]} fill={to} />
    </svg>
  );
}

/** Trabajos reales, no maquetas: seis webs que están publicadas. Es lo que más
 *  convence a quien duda de que por 299€ salga algo presentable. */
const MUESTRAS = [
  { src: "/img/casos/benbunan-clinica-dental/desarrollo-web/01.webp", alt: "Web de Benbunan Clínica Dental" },
  { src: "/img/casos/marina-padel/desarrollo-web/01.png", alt: "Web de Marina Pádel" },
  { src: "/img/casos/viso-psicologos/desarrollo-web/01.png", alt: "Web de Viso Psicólogos" },
  { src: "/img/casos/reformas-servilucas/desarrollo-web/01-desktop.webp", alt: "Web de Reformas Servilucas" },
  { src: "/img/casos/phoenix-dental/desarrollo-web/01-desktop.webp", alt: "Web de Phoenix Dental" },
  { src: "/img/casos/yebenes/desarrollo-web/01.png", alt: "Web de Yébenes" },
] as const;

export function Web299LandingPage() {
  return (
    <div style={{ background: CREAM, color: INK }}>
      {/* HERO: el formulario va AQUÍ, a la derecha y visible sin hacer scroll.
          Es la decisión que más mueve la conversión en una landing de pago: con
          el formulario al final, quien entra decidido tiene que buscarlo. */}
      <section className="relative overflow-hidden" style={{ background: INK, color: "#fff" }}>
        {/* Halos del acento. Muy tenues: dan profundidad sin competir con el texto. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full opacity-25 blur-3xl"
          style={{ background: ACCENT }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 top-40 h-[22rem] w-[22rem] rounded-full opacity-15 blur-3xl"
          style={{ background: ACCENT_ON_DARK }}
        />
        <Container className="relative py-14 md:py-20">
          <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_minmax(360px,420px)] lg:gap-14">
            <div>
              <p
                className="text-[13px] font-bold uppercase tracking-[0.14em]"
                style={{ color: ACCENT_ON_DARK }}
              >
                Desarrollo web a precio cerrado
              </p>
              <h1 className="mt-4 text-[38px] font-extrabold leading-[1.05] tracking-tight sm:text-[52px] lg:text-[60px]">
                Tu página web
                <br />
                <span style={{ color: ACCENT_ON_DARK }}>por {WEB_299_PRICE}</span>
              </h1>
              <p className="mt-5 max-w-xl text-[17px] leading-relaxed sm:text-[19px]" style={{ color: "rgba(255,255,255,.82)" }}>
                Pago único, sin cuotas mensuales por la web. Diseñada a partir de lo que nos cuentes
                de tu negocio, no una plantilla rellenada.
              </p>

              <ul className="mt-8 space-y-3">
                {WEB_299_HERO_BULLETS.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-[16px] sm:text-[17px]">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[13px] font-bold"
                      style={{ background: "rgba(125,176,247,.18)", color: ACCENT_ON_DARK }}
                    >
                      ✓
                    </span>
                    <span style={{ color: "rgba(255,255,255,.92)" }}>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:sticky lg:top-24">
              <Web299Form ubicacion="hero" />
            </div>
          </div>
        </Container>
        <Cut to={CREAM} shape="valley" />
      </section>

      {/* PRECIO, desglosado y arriba. Esconder el coste real hasta el final es
          lo que hace que la gente desconfíe, y aquí el precio ES el argumento. */}
      <section className="relative" style={{ background: CREAM }}>
        <Container className="py-16 md:py-20">
          <h2 className="text-center text-[30px] font-extrabold leading-tight sm:text-[38px]">
            Qué cuesta, todo
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-[16px] leading-relaxed sm:text-[17px]" style={{ color: "#5A6178" }}>
            Sin letra pequeña. Estos son los tres únicos conceptos, y dos de ellos son anuales y
            puedes llevarte a quien quieras.
          </p>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {WEB_299_PRICING.map((p) => (
              <div
                key={p.label}
                className="rounded-2xl p-7"
                style={
                  p.highlight
                    ? { background: INK, color: "#fff", boxShadow: "0 20px 50px -24px rgba(11,16,32,.55)" }
                    : { background: "#fff", border: "1px solid rgba(11,16,32,.10)" }
                }
              >
                <p
                  className="text-[13px] font-bold uppercase tracking-[0.1em]"
                  style={{ color: p.highlight ? ACCENT_ON_DARK : "#5A6178" }}
                >
                  {p.label}
                </p>
                <p className="mt-3 flex items-baseline gap-2">
                  <span className="text-[44px] font-extrabold leading-none tracking-tight">
                    {p.price}
                  </span>
                  <span className="text-[15px] font-semibold" style={{ color: p.highlight ? "rgba(255,255,255,.7)" : "#5A6178" }}>
                    {p.period}
                  </span>
                </p>
                <p
                  className="mt-4 text-[15px] leading-relaxed"
                  style={{ color: p.highlight ? "rgba(255,255,255,.85)" : "#3E4557" }}
                >
                  {p.detail}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* MUESTRAS: webs publicadas de verdad. */}
      <section className="relative overflow-hidden" style={{ background: "#fff" }}>
        <Container className="py-16 md:py-20">
          <h2 className="text-center text-[30px] font-extrabold leading-tight sm:text-[38px]">
            Webs que ya están publicadas
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-[16px] leading-relaxed sm:text-[17px]" style={{ color: "#5A6178" }}>
            Trabajos reales de negocios como el tuyo. Ninguna es una maqueta.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {MUESTRAS.map((m) => (
              <div
                key={m.src}
                className="overflow-hidden rounded-2xl"
                style={{ border: "1px solid rgba(11,16,32,.10)", background: CREAM }}
              >
                <Image
                  src={m.src}
                  alt={m.alt}
                  width={800}
                  height={600}
                  className="h-auto w-full"
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                />
              </div>
            ))}
          </div>
        </Container>
        <Cut to={CREAM} shape="wave" />
      </section>

      {/* QUÉ INCLUYE / QUÉ NO. El "qué no" a la misma altura y con el mismo peso
          tipográfico: esconderlo es lo que genera la discusión incómoda después. */}
      <section className="relative" style={{ background: CREAM }}>
        <Container className="py-16 md:py-20">
          <div className="grid gap-10 md:grid-cols-2 md:gap-12">
            <div>
              <h2 className="text-[26px] font-extrabold leading-tight sm:text-[32px]">
                Qué incluye
              </h2>
              <ul className="mt-6 space-y-4">
                {WEB_299_INCLUDES.map((i) => (
                  <li key={i} className="flex items-start gap-3 text-[16px] leading-relaxed">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[13px] font-bold"
                      style={{ background: "rgba(24,123,239,.12)", color: ACCENT_DEEP }}
                    >
                      ✓
                    </span>
                    <span style={{ color: "#3E4557" }}>{i}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-[26px] font-extrabold leading-tight sm:text-[32px]">
                Qué no incluye
              </h2>
              <ul className="mt-6 space-y-4">
                {WEB_299_EXCLUDES.map((e) => (
                  <li key={e} className="flex items-start gap-3 text-[16px] leading-relaxed">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[13px] font-bold"
                      style={{ background: "rgba(11,16,32,.07)", color: "#5A6178" }}
                    >
                      –
                    </span>
                    <span style={{ color: "#3E4557" }}>{e}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="relative overflow-hidden" style={{ background: INK, color: "#fff" }}>
        <Container className="py-16 md:py-20">
          <h2 className="text-center text-[30px] font-extrabold leading-tight sm:text-[38px]">
            Cómo funciona
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {WEB_299_STEPS.map((s, i) => (
              <div key={s.title}>
                <p
                  className="text-[56px] font-extrabold leading-none tracking-tight"
                  style={{ color: "rgba(125,176,247,.28)" }}
                >
                  {i + 1}
                </p>
                <p className="mt-2 text-[19px] font-bold">{s.title}</p>
                <p className="mt-2 text-[16px] leading-relaxed" style={{ color: "rgba(255,255,255,.82)" }}>
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </Container>
        <Cut to={CREAM} shape="crest" />
      </section>

      {/* FAQS */}
      <section className="relative" style={{ background: CREAM }}>
        <Container className="py-16 md:py-20">
          <h2 className="text-center text-[30px] font-extrabold leading-tight sm:text-[38px]">
            Dudas razonables
          </h2>
          <div className="mx-auto mt-10 max-w-3xl space-y-4">
            {WEB_299_FAQS.map((f) => (
              <details
                key={f.q}
                className="group rounded-2xl p-6"
                style={{ background: "#fff", border: "1px solid rgba(11,16,32,.10)" }}
              >
                <summary className="cursor-pointer list-none text-[17px] font-bold" style={{ color: INK }}>
                  {f.q}
                </summary>
                <p className="mt-3 text-[16px] leading-relaxed" style={{ color: "#3E4557" }}>
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      {/* CIERRE con el formulario otra vez: quien llega hasta aquí ya ha leído
          las condiciones y no debería tener que volver arriba. */}
      <section className="relative overflow-hidden" style={{ background: INK, color: "#fff" }}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-28 -top-24 h-[24rem] w-[24rem] rounded-full opacity-20 blur-3xl"
          style={{ background: ACCENT }}
        />
        <Container className="relative py-16 md:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_minmax(360px,420px)] lg:gap-14">
            <div>
              <h2 className="text-[30px] font-extrabold leading-tight sm:text-[40px]">
                ¿Empezamos?
              </h2>
              <p className="mt-4 max-w-lg text-[17px] leading-relaxed" style={{ color: "rgba(255,255,255,.82)" }}>
                Déjanos tu nombre, tu teléfono y tu correo. Te llamamos en menos de 24 horas, te
                damos fecha de entrega y decides. En {WEB_299_DAYS} días laborables la puedes tener
                publicada.
              </p>
              <p className="mt-6 text-[14px]" style={{ color: "rgba(255,255,255,.62)" }}>
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
