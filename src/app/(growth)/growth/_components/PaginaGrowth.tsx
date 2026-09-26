import Image from "next/image";
import { GROWTH_THEME as T } from "@/lib/growth-config";
import { CONTACT_INFO } from "@/lib/contact-info";
import type { SectorGrowth } from "@/lib/growth-sectores";
import { Pasos } from "./Pasos";
import { Logotipo } from "./Logotipo";
import { FormularioHero } from "./FormularioHero";
import { Planes } from "./Planes";
import { CalendarioReserva } from "./CalendarioReserva";
import { Faqs } from "./Faqs";
import { AlAparecer } from "./AlAparecer";

/**
 * El cuerpo de la landing, compartido por `/growth` y por cada `/growth/<sector>`.
 *
 * **Existe para que no haya dos copias.** Con una por sector, el día que cambie
 * el precio hay que acordarse de tocarlo en cinco sitios, y no se acuerda nadie.
 * Lo que cambia por sector —la cabecera, a quién buscan las campañas y las
 * preguntas— viene de `growth-sectores.ts`.
 *
 * El aspecto es el propio de Growth: negro verdoso con azul petróleo y
 * turquesa, Plus Jakarta Sans, cabeceras de sección centradas, tarjetas con
 * borde fino y nada dibujado a mano. Ver `GROWTH_THEME`.
 */

/** Contenedor de la página. Un solo ancho: esta página se lee, no se recorre. */
function Wrap({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-5 sm:px-8 ${className}`}>{children}</div>;
}

/** Rótulo de sección: una píldora teñida, en minúsculas y sin espaciado ancho. */
function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold"
      style={{ background: `${T.accent}1f`, color: T.accentText }}
    >
      {children}
    </span>
  );
}

/** Cabecera centrada de cada sección. */
function Cabecera({
  rotulo,
  titulo,
  texto,
}: {
  rotulo: string;
  titulo: React.ReactNode;
  texto?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <Rotulo>{rotulo}</Rotulo>
      <h2
        className="mt-4 font-extrabold leading-[1.1] tracking-[-0.02em] text-balance"
        style={{ fontSize: "clamp(1.875rem, 3.6vw, 2.75rem)" }}
      >
        {titulo}
      </h2>
      {texto && (
        <p className="mt-4 text-lg leading-relaxed text-pretty" style={{ color: T.muted }}>
          {texto}
        </p>
      )}
    </div>
  );
}

/** Una marca de verificación en su círculo, para las garantías del hero. */
function Check() {
  return (
    <span
      aria-hidden
      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
      style={{ background: T.accent }}
    >
      <svg viewBox="0 0 16 16" className="h-3 w-3">
        <path
          d="M3.5 8.5 6.5 11.5 12.5 5"
          fill="none"
          stroke={T.onAccent}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

/**
 * Los tres pasos del servicio, en el orden en que pasan.
 *
 * Son a la vez la explicación del proceso y el inventario de lo que entra en la
 * cuota, por eso los planes van justo detrás. Solo el de campañas cambia por
 * sector: a quién se busca se dice con las palabras del gremio.
 */
function pasosPara(sector: SectorGrowth) {
  return [
    {
      n: "01",
      t: "Desarrollo de landing",
      d: "Una página de captación hecha para ti, alojada por nosotros y pensada para que quien llegue desde un anuncio pida cita. No hay que tocar nada ni contratar a nadie más.",
    },
    { n: "02", t: "Gestión de campañas", d: sector.campanas },
    {
      n: "03",
      t: "Análisis y optimización",
      d: "Medimos qué campañas y qué anuncios traen más solicitudes, y a qué coste. Con eso ajustamos anuncios, públicos y presupuesto cada mes.",
    },
  ];
}

/**
 * Las tres garantías bajo el subtítulo. Son las tres dudas que frenan a quien
 * llega desde un anuncio —cuánto cuesta, si le atan, qué recibe— contestadas
 * antes de que las piense.
 */
const GARANTIAS = ["Desde 199 € al mes", "Sin permanencia", "Landing y campañas incluidas"];

export function PaginaGrowth({ sector }: { sector: SectorGrowth }) {
  return (
    <>
      {/* ───────── 1. Hero ───────── */}
      <header
        className="relative overflow-hidden pb-14 pt-8 md:pb-20"
        style={{ background: `linear-gradient(180deg, ${T.soft} 0%, ${T.bg} 100%)` }}
      >
        {/* La foto del sector, fundida con el fondo por la izquierda para
            que el titular se lea encima. Solo la llevan los sectores que tienen
            una foto propia: repetir la misma en todos no distinguiría nada. */}
        {sector.imagen && (
          <>
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <Image
                src={sector.imagen}
                alt=""
                fill
                sizes="100vw"
                className="object-cover"
                style={{ opacity: 0.45 }}
              />
            </div>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background: `linear-gradient(100deg, ${T.bg} 0%, ${T.bg}f2 38%, ${T.bg}b3 62%, ${T.soft}66 100%)`,
              }}
            />
          </>
        )}

        <Wrap className="relative">
          <Logotipo />

          <div className="mt-10 grid items-center gap-10 lg:mt-14 lg:grid-cols-[minmax(0,1fr)_25rem] lg:gap-14">
            {/* **Una frase por renglón, siempre.** El tamaño se mide contra la
                columna (`cqw`) y no contra la ventana, así que cada frase cabe
                entera en su línea a cualquier ancho, del móvil al monitor. El
                coeficiente está medido en el navegador: la frase más larga,
                «¿Huecos en tu agenda?», mide 10,89 veces su cuerpo en Plus Jakarta
                Sans, y 8,8 la deja al 96 % de la columna. Si cambia el titular o la
                letra, hay que volver a
                medirlo. */}
            <div style={{ containerType: "inline-size" }}>
              {sector.eyebrow && <Rotulo>{sector.eyebrow}</Rotulo>}

              <h1
                className="mt-5 font-extrabold leading-[1.08] tracking-[-0.025em]"
                style={{ fontSize: "clamp(1.5rem, 8.8cqw, 5.5rem)" }}
              >
                <span className="block whitespace-nowrap">{sector.titular.primera}</span>
                <span className="block whitespace-nowrap" style={{ color: T.accentText }}>
                  {sector.titular.segunda}
                </span>
              </h1>

              <p
                className="mt-6 max-w-xl leading-relaxed text-pretty"
                style={{ fontSize: "clamp(1.125rem, 1.6vw, 1.375rem)", color: T.muted }}
              >
                {sector.subtitulo.antes}
                <strong className="font-semibold" style={{ color: T.fg }}>
                  {sector.subtitulo.resaltado}
                </strong>
                {sector.subtitulo.despues}
              </p>

              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
                {GARANTIAS.map((g) => (
                  <li key={g} className="flex items-center gap-2 text-[0.95rem] font-semibold">
                    <Check />
                    {g}
                  </li>
                ))}
              </ul>
            </div>

            <FormularioHero
              sectorPorDefecto={sector.valorFormulario}
              termino={sector.termino.singular}
            />
          </div>
        </Wrap>
      </header>

      {/* ───────── 2. Cómo trabajamos ───────── */}
      <section className="py-16 md:py-24" style={{ background: T.bg }}>
        <Wrap>
          <AlAparecer>
            <Cabecera
              rotulo="Cómo trabajamos"
              titulo="Nos ocupamos de todo, de principio a fin"
              texto={
                <>
                  Tú encárgate de {sector.tuParte}.{" "}
                  <strong className="font-semibold" style={{ color: T.fg }}>
                    Nosotros, de llenarte la agenda.
                  </strong>
                </>
              }
            />
          </AlAparecer>
          <Pasos pasos={pasosPara(sector)} />
        </Wrap>
      </section>

      {/* ───────── 3. Planes ───────── */}
      <section className="py-16 md:py-24" style={{ background: T.soft }}>
        <Wrap>
          <AlAparecer>
            <Cabecera
              rotulo="Planes"
              titulo="Dos planes, sin letra pequeña"
              texto="La diferencia está en los canales y en el informe mensual. Todo lo demás va en los dos."
            />
          </AlAparecer>
          <AlAparecer>
            <Planes />
          </AlAparecer>
        </Wrap>
      </section>

      {/* ───────── 4. Sin permanencia ─────────
          La única banda oscura de la página, para que la frase que resuelve la
          desconfianza que deja cualquier precio se note antes de leerla. */}
      <section
        className="py-14 md:py-16"
        style={{
          background: T.dark,
          color: T.onDark,
          borderTop: `1px solid ${T.line}`,
          borderBottom: `1px solid ${T.line}`,
        }}
      >
        <Wrap>
          <AlAparecer>
            <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
              <div className="max-w-2xl">
                <p
                  className="font-extrabold leading-[1.1] tracking-[-0.02em]"
                  style={{ fontSize: "clamp(1.875rem, 3.6vw, 2.75rem)" }}
                >
                  Sin permanencia.{" "}
                  <span style={{ color: T.accent }}>Mes a mes.</span>
                </p>
                <p className="mt-3 text-lg leading-relaxed" style={{ color: T.onDarkMuted }}>
                  Vas a querer quedarte por los resultados, no porque te obliguemos.
                </p>
              </div>

              {/* WhatsApp y no otro formulario: el del hero es para quien deja su
                  teléfono, y hay gente que no lo deja pero sí escribe. */}
              <a
                href={CONTACT_INFO.socials.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-2.5 rounded-lg px-6 py-3.5 text-base font-bold transition-opacity hover:opacity-90"
                style={{ background: T.accent, color: T.onAccent }}
              >
                <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="currentColor">
                  <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.650-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23a8.2 8.2 0 0 1 8.24 8.24c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.470-.72-1.690-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.16 0-.43.06-.65.31-.22.25-.85.83-.85 2.03s.87 2.35.99 2.51c.12.17 1.71 2.61 4.15 3.66.58.25 1.03.4 1.39.51.58.19 1.11.16 1.53.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.11-.22-.17-.47-.29Z" />
                </svg>
                Escríbenos por WhatsApp
              </a>
            </div>
          </AlAparecer>
        </Wrap>
      </section>

      {/* ───────── 5. Reunión online ───────── */}
      <CalendarioReserva />

      {/* ───────── 6. Preguntas frecuentes ───────── */}
      <section className="py-16 md:py-24" style={{ background: T.soft }}>
        <Wrap>
          <AlAparecer>
            <Faqs sector={sector} />
          </AlAparecer>
        </Wrap>
      </section>
    </>
  );
}
