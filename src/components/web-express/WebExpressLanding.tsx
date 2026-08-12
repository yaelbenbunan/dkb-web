import { Container } from "@/components/ui/Container";
import { WebExpressForm } from "./WebExpressForm";
import {
  WEB_EXPRESS_PRICE,
  WEB_EXPRESS_DAYS,
  type WebExpressLanding as Landing,
} from "@/lib/web-express-landings";

/**
 * Landing de captación para el producto de web cerrada.
 *
 * PALETA PROPIA, a propósito. La primera versión usaba los tokens del sitio y
 * en modo oscuro media landing quedaba con texto casi negro sobre fondo casi
 * negro: las secciones sin fondo explícito heredaban el tema del visitante
 * mientras el texto seguía fijado en claro. Aquí cada superficie declara su
 * fondo Y su color, así que se ve igual venga quien venga del anuncio.
 *
 * Tinta y crema en vez de blanco y gris: el azul de marca sobre crema cálido
 * encaja con el nicho mejor que el blanco clínico y da profundidad sin salirse
 * de la paleta corporativa.
 */

const INK = "#0B1020";
const CREAM = "#FBF8F4";
const ACCENT = "#187bef";
/** Para texto sobre fondos CLAROS: el acento a secas se queda justo. */
const ACCENT_DEEP = "#0F5FBD";
/**
 * Para texto sobre la tinta. El azul de marca sobre la tinta se queda en 4.4 de
 * contraste, justo por debajo del mínimo para texto pequeño. Esta versión
 * aclarada sube a 7.3 y sirve para etiquetas, cifras y glifos sobre oscuro.
 */
const ACCENT_ON_DARK = "#7DB0F7";

/**
 * Corte curvo entre secciones. Tres curvas distintas, no tres diagonales: las
 * rectas paralelas repetidas son justo lo que hace que una landing parezca una
 * plantilla, y la curva da el movimiento que la recta no tiene.
 *
 * Va DENTRO de la sección anterior, en posición absoluta sobre su fondo, y no
 * como bloque intermedio con fondo propio. Aquello dejaba un escalón visible
 * cuando la sección de arriba tenía degradado o halos: el bloque los pintaba
 * planos y se veía la línea donde acababa uno y empezaba el otro. Así solo hay
 * un fondo, y la curva se recorta encima.
 *
 * Cada trazado rebasa el lienzo por los lados para que el borde antialiaseado
 * caiga fuera del área visible y no aparezca la costura de un píxel.
 */
type CutShape = "valley" | "wave" | "crest";

function Cut({
  to,
  shape = "valley",
  height = 90,
}: {
  /** Color de la sección que viene DESPUÉS. */
  to: string;
  shape?: CutShape;
  height?: number;
}) {
  // Las tres curvas rebasan el lienzo por los lados para que el borde
  // antialiaseado quede fuera del área visible y no aparezca la costura.
  const paths: Record<CutShape, string> = {
    // Hundida en el centro, como una sonrisa.
    valley: "M-1,7 L-1,1.5 Q50,7.5 101,1.5 L101,7 Z",
    // Doble ondulación: la que más movimiento aporta, va en el centro.
    wave: "M-1,7 L-1,3.4 C22,-0.6 40,6.2 58,2.8 C76,-0.4 89,3.4 101,1.8 L101,7 Z",
    // Elevada en el centro, la opuesta a valley.
    crest: "M-1,7 L-1,4.5 Q50,-1.5 101,4.5 L101,7 Z",
  };
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

export function WebExpressLandingPage({ landing }: { landing: Landing }) {
  return (
    <div style={{ background: CREAM, color: INK }}>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden" style={{ background: INK }}>
        <div className="absolute inset-0 -z-10">
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(160deg, ${INK} 30%, rgba(11,16,32,.82) 100%)` }}
          />
          <div
            className="absolute -right-32 -top-24 h-[560px] w-[560px] rounded-full blur-3xl"
            style={{ background: ACCENT, opacity: 0.16 }}
          />
          <div
            className="absolute -left-40 top-40 h-[520px] w-[520px] rounded-full blur-3xl"
            style={{ background: "#0EA5E9", opacity: 0.2 }}
          />
        </div>

        {/* Sin etiqueta sobre el titular: en móvil se comía la altura que hace
            falta para que el botón entre sin hacer scroll, que es lo que decide
            si alguien que llega del anuncio convierte o se va. */}
        <Container size="wide" className="relative z-10 pb-24 pt-8 text-center sm:pb-28 sm:pt-16 lg:pt-24">
          <h1 className="mx-auto max-w-4xl text-[2.4rem] font-black leading-[1.03] tracking-[-0.03em] text-white sm:text-[4.25rem]">
            {landing.headline}{" "}
            <span className="relative inline-block">
              <span style={{ color: ACCENT_ON_DARK }}>{landing.headlineAccent}</span>
              {/* Subrayado a mano alzada: rompe la rigidez del bloque de texto */}
              <svg
                className="absolute -bottom-2 left-0 w-full"
                height="14"
                viewBox="0 0 300 14"
                fill="none"
                aria-hidden="true"
                preserveAspectRatio="none"
              >
                <path
                  d="M2 9C60 3 130 2 190 5c40 2 80 5 108 4"
                  stroke={ACCENT_ON_DARK}
                  strokeWidth="4"
                  strokeLinecap="round"
                  opacity=".55"
                />
              </svg>
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-[17px] leading-relaxed text-slate-300 sm:mt-8 sm:text-xl">
            {landing.subhead}
          </p>


          {/* Los tres datos clave, una sola vez y aquí. Más grandes que en la
              primera versión: son la razón por la que alguien sigue leyendo. */}
          <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 sm:mt-8 sm:gap-y-3.5">
            {landing.heroBullets.map((b) => (
              <li
                key={b}
                className="flex items-center gap-3 text-[17px] font-bold text-white sm:text-lg"
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-black"
                  style={{ background: ACCENT, color: "#fff" }}
                  aria-hidden="true"
                >
                  ✓
                </span>
                {b}
              </li>
            ))}
          </ul>

          <div className="mt-7 flex flex-col items-center gap-3 sm:mt-10 sm:gap-4">
            <a
              href="#formulario"
              className="inline-flex items-center justify-center rounded-2xl px-9 py-4 text-base font-black transition-transform hover:-translate-y-0.5"
              style={{ background: ACCENT, color: "#fff", boxShadow: "0 14px 34px -12px rgba(24,123,239,.8)" }}
            >
              Quiero mi web por {WEB_EXPRESS_PRICE} →
            </a>
            <p className="text-[15px] text-slate-400">Sin compromiso · Te contactamos en 24 h</p>
          </div>
        </Container>
        <Cut to={CREAM} shape="valley" height={100} />
      </section>

      {/* ── FORMULARIO A LO ANCHO ────────────────────────────── */}
      <section id="formulario" className="scroll-mt-20 py-16" style={{ background: CREAM }}>
        <Container size="wide">
          <WebExpressForm landing={landing} />
        </Container>
      </section>

      {/* ── DOLORES ──────────────────────────────────────────── */}
      <section className="relative pb-32 pt-16" style={{ background: CREAM }}>
        <Container size="wide">
          <h2 className="max-w-2xl text-3xl font-black tracking-tight sm:text-[2.6rem]" style={{ color: INK }}>
            {landing.painTitle}
          </h2>
          <p className="mt-3 text-lg" style={{ color: "#5A6178" }}>
            {landing.painIntro}
          </p>

          {/* Problema arriba, en grande y entrecomillado como si lo dijera quien
              lee; respuesta debajo, separada y en el acento. Reconocerse en la
              queja es lo que engancha, pero sin la respuesta al lado la sección
              solo describe el problema y no da motivo para seguir. */}
          <ul className="mt-10 grid gap-5 md:grid-cols-2">
            {landing.pains.map((p) => (
              <li
                key={p.problem}
                className="flex flex-col rounded-3xl bg-white p-7 transition-transform duration-200 hover:-translate-y-1"
                style={{
                  border: "1px solid rgba(11,16,32,.08)",
                  boxShadow: "0 2px 14px -6px rgba(11,16,32,.14)",
                }}
              >
                <p
                  className="text-lg font-bold leading-snug sm:text-xl"
                  style={{ color: INK }}
                >
                  {p.problem}
                </p>
                <div
                  className="mt-5 flex gap-3 border-t pt-5 text-[15px] leading-relaxed"
                  style={{ borderColor: "rgba(11,16,32,.08)", color: "#3D4356" }}
                >
                  <span
                    className="mt-1 shrink-0 text-base font-black leading-none"
                    style={{ color: ACCENT_DEEP }}
                    aria-hidden="true"
                  >
                    →
                  </span>
                  {p.answer}
                </div>
              </li>
            ))}
          </ul>
        </Container>
        <Cut to={INK} shape="wave" height={110} />
      </section>

      {/* ── PROCESO ──────────────────────────────────────────── */}
      <section className="py-16" style={{ background: INK }}>
        <Container size="wide">
          <h2 className="text-3xl font-black tracking-tight text-white sm:text-[2.6rem]">
            {landing.stepsTitle}
          </h2>
          <p className="mt-3 text-lg text-slate-400">De la primera respuesta a tu web publicada.</p>

          <ol className="relative mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            {/* Hilo que une los pasos: convierte cuatro tarjetas sueltas en un recorrido */}
            <div
              aria-hidden="true"
              className="absolute left-0 right-0 top-7 hidden lg:block"
              style={{
                height: 2,
                background: `repeating-linear-gradient(90deg, rgba(125,176,247,.5) 0 10px, transparent 10px 20px)`,
              }}
            />
            {landing.steps.map((s, i) => (
              <li key={s.title} className="group relative transition-transform duration-200 hover:-translate-y-1.5">
                <span
                  className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-black transition-transform duration-200 group-hover:scale-110 group-hover:rotate-3"
                  style={{
                    background: i === landing.steps.length - 1 ? ACCENT : INK,
                    color: i === landing.steps.length - 1 ? "#fff" : ACCENT_ON_DARK,
                    border: `2px solid ${ACCENT_ON_DARK}`,
                    boxShadow: i === landing.steps.length - 1 ? "0 12px 30px -12px rgba(24,123,239,.9)" : "none",
                  }}
                >
                  {i + 1}
                </span>
                <p className="mt-5 text-lg font-bold text-white">{s.title}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-400">{s.description}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* ── QUÉ INCLUYE / QUÉ NO ─────────────────────────────── */}
      <section className="relative pb-32" style={{ background: INK }}>
        <Container size="wide">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl p-8" style={{ background: "rgba(24,123,239,.09)", border: `1px solid rgba(24,123,239,.3)` }}>
              <h2 className="text-xl font-black text-white">
                {landing.includesTitle} <span style={{ color: ACCENT_ON_DARK }}>por {WEB_EXPRESS_PRICE}</span>
              </h2>
              <ul className="mt-6 flex flex-col gap-4">
                {landing.includes.map((i) => (
                  <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-slate-200">
                    <span className="mt-0.5 shrink-0 font-black" style={{ color: ACCENT_ON_DARK }}>✓</span>
                    {i}
                  </li>
                ))}
              </ul>
            </div>
            {/* Al mismo peso visual a propósito: esconder lo que queda fuera es
                lo que provoca la discusión incómoda a mitad de proyecto. */}
            <div className="rounded-3xl p-8" style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)" }}>
              <h2 className="text-xl font-black text-white">{landing.excludesTitle}</h2>
              <ul className="mt-6 flex flex-col gap-4">
                {landing.excludes.map((e) => (
                  <li key={e} className="flex gap-3 text-[15px] leading-relaxed text-slate-400">
                    <span className="mt-0.5 shrink-0 font-black text-slate-500">—</span>
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
        <Cut to={CREAM} shape="crest" height={90} />
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section className="py-16" style={{ background: CREAM }}>
        <Container className="max-w-3xl">
          <h2 className="text-3xl font-black tracking-tight sm:text-[2.6rem]" style={{ color: INK }}>
            {landing.faqsTitle}
          </h2>
          <div className="mt-9 flex flex-col gap-3">
            {landing.faqs.map((f) => (
              <details
                key={f.q}
                className="group rounded-2xl bg-white px-6 py-5"
                style={{ border: "1px solid rgba(11,16,32,.09)" }}
              >
                <summary
                  className="flex cursor-pointer list-none items-start gap-3 font-bold marker:hidden"
                  style={{ color: INK }}
                >
                  <span
                    className="mt-0.5 shrink-0 text-xl leading-none transition-transform group-open:rotate-45"
                    style={{ color: ACCENT_DEEP }}
                  >
                    +
                  </span>
                  {f.q}
                </summary>
                <p className="mt-3 pl-8 text-[15px] leading-relaxed" style={{ color: "#3D4356" }}>
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      {/* ── CIERRE ───────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden py-20" style={{ background: INK }}>
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 -z-10 h-[460px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
          style={{ background: ACCENT, opacity: 0.14 }}
        />
        <Container className="text-center">
          <h2 className="text-3xl font-black tracking-tight text-white sm:text-[2.75rem]">
            Tu web lista en {WEB_EXPRESS_DAYS} días laborables
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-slate-300">
            Precio cerrado de {WEB_EXPRESS_PRICE}. Sin cuotas mensuales y sin sorpresas.
          </p>
          <a
            href="#formulario"
            className="mt-9 inline-flex items-center justify-center rounded-2xl px-10 py-4 text-base font-black transition-transform hover:-translate-y-0.5"
            style={{ background: ACCENT, color: "#fff", boxShadow: "0 14px 34px -12px rgba(24,123,239,.8)" }}
          >
            Quiero mi web por {WEB_EXPRESS_PRICE} →
          </a>
        </Container>
      </section>
    </div>
  );
}
