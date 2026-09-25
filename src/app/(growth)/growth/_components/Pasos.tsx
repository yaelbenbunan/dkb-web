import { GROWTH_THEME as T } from "@/lib/growth-config";
import { AlAparecer } from "./AlAparecer";

/**
 * Los tres pasos, en tres tarjetas.
 *
 * Tarjetas blancas con borde fino, el dibujo en una baldosa teñida y el número
 * escrito como «Paso 1». Es otra forma de contar lo mismo que en la landing de
 * Escala —que eran tarjetas oscuras con volumen, número en insignia y flechas
 * entre ellas— porque Growth no puede parecerse a ella (25-09-2026).
 *
 * Los dibujos son la versión mirada de lo que dice el texto, y por eso van con
 * `aria-hidden`: una página, gente que llega, barras que suben.
 */

export interface Paso {
  n: string;
  t: string;
  d: string;
}

export function Pasos({ pasos }: { pasos: Paso[] }) {
  const dibujos = [Web, Captacion, Analisis];

  return (
    <ol className="mt-12 grid gap-5 md:grid-cols-3">
      {pasos.map((p, i) => {
        const Dibujo = dibujos[i] ?? Captacion;
        return (
          // El envoltorio va DENTRO del <li>: un <ol> solo admite <li> como hijo
          // directo, y el lector de pantalla necesita la lista entera.
          <li key={p.n} className="h-full">
            <AlAparecer retraso={i * 110} className="h-full">
              <div
                className="flex h-full flex-col rounded-2xl p-6"
                style={{
                  background: T.bg,
                  border: `1px solid ${T.line}`,
                  boxShadow: "0 1px 2px rgba(15,43,48,0.04), 0 8px 24px -16px rgba(15,43,48,0.18)",
                }}
              >
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-xl p-2.5"
                  style={{ background: T.soft }}
                >
                  <Dibujo />
                </div>
                <p className="mt-6 text-sm font-semibold" style={{ color: T.accentText }}>
                  <span className="sr-only">{p.n}. </span>Paso {Number(p.n)}
                </p>
                <p className="mt-1 text-xl font-bold leading-snug">{p.t}</p>
                <p className="mt-2 text-base leading-relaxed" style={{ color: T.muted }}>
                  {p.d}
                </p>
              </div>
            </AlAparecer>
          </li>
        );
      })}
    </ol>
  );
}

/** Gente que llega: tres siluetas entrando por una boca que las encauza. */
function Captacion() {
  return (
    <svg aria-hidden viewBox="0 0 120 72" className="h-full w-auto max-w-full" style={{ color: T.accentText }}>
      <g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M6 14h44M6 30h34M6 46h24" opacity="0.35" />
        <path d="M62 8 96 36 62 64" opacity="0.25" />
      </g>
      <g fill="currentColor">
        <circle cx="104" cy="26" r="7" />
        <path d="M92 50a12 12 0 0 1 24 0z" />
      </g>
    </svg>
  );
}

/**
 * Una página web: el marco del navegador y, dentro, el botón de pedir cita.
 *
 * **Sustituye al calendario que había aquí.** Aquel dibujaba el paso «los
 * pasamos a tu agenda», que ya no es uno de los tres: ahora el primero es hacer
 * la web. Un dibujo que no dice lo que dice su paso es peor que ninguno, porque
 * se mira antes de leer.
 */
function Web() {
  return (
    <svg aria-hidden viewBox="0 0 120 72" className="h-full w-auto max-w-full" style={{ color: T.accentText }}>
      <g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <rect x="4" y="6" width="112" height="60" rx="8" opacity="0.4" />
        <path d="M4 22h112" opacity="0.4" />
        <path d="M16 40h40M16 52h26" opacity="0.3" />
      </g>
      <g fill="currentColor">
        <circle cx="16" cy="14" r="2.6" opacity="0.45" />
        <circle cx="25" cy="14" r="2.6" opacity="0.45" />
        <circle cx="34" cy="14" r="2.6" opacity="0.45" />
        <rect x="72" y="36" width="34" height="18" rx="9" />
      </g>
    </svg>
  );
}

/** Barras que suben con la flecha del retorno por encima. */
function Analisis() {
  return (
    <svg aria-hidden viewBox="0 0 120 76" className="h-full w-auto max-w-full" style={{ color: T.accentText }}>
      <g fill="currentColor">
        <rect x="8" y="50" width="16" height="22" rx="3" opacity="0.3" />
        <rect x="34" y="38" width="16" height="34" rx="3" opacity="0.45" />
        <rect x="60" y="26" width="16" height="46" rx="3" opacity="0.65" />
        <rect x="86" y="8" width="16" height="64" rx="3" />
      </g>
      <path
        d="M10 40 40 28 66 16 100 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}
