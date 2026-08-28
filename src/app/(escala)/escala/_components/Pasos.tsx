import { GROWTH_THEME as T } from "@/lib/growth-config";
import { AlAparecer } from "./AlAparecer";

/**
 * Los tres pasos, en tres tarjetas con dibujo.
 *
 * Antes era una lista vertical: tres párrafos uno debajo de otro, con media
 * página vacía a la derecha y sin nada que mirar. Y esa sección se lee de
 * refilón — nadie llega a una landing a estudiar un proceso—, así que si hay
 * que leerla entera para entenderla, no se entiende.
 *
 * En tres columnas ocupa el ancho que ya tenía asignado, y cada paso lleva un
 * dibujo que cuenta lo mismo que el texto. Quien lee, lee; quien pasa la vista,
 * ve tres viñetas y se queda con la idea igual.
 *
 * Los dibujos son de trazo, del mismo idioma que el subrayado y el círculo a
 * mano, y ninguno es un icono de librería: cada uno dice EXACTAMENTE lo que
 * hace su paso —gente que llega, un día marcado en un calendario, barras que
 * suben— en vez de una metáfora que hay que descifrar.
 */

export interface Paso {
  n: string;
  t: string;
  d: string;
}

export function Pasos({ pasos }: { pasos: Paso[] }) {
  const dibujos = [Captacion, Agenda, Rentabilidad];

  return (
    <ol className="mt-12 grid gap-5 md:grid-cols-3">
      {pasos.map((p, i) => {
        const Dibujo = dibujos[i] ?? Captacion;
        return (
          // El envoltorio va DENTRO del <li> y no fuera: un <ol> solo admite
          // <li> como hijo directo, y meter un <div> entre medias rompe la
          // lista para el lector de pantalla — que es quien más la necesita,
          // porque estos tres son una secuencia y no tres tarjetas sueltas.
          //
          // Escalonados en el orden de los pasos, por lo mismo: entrando a la
          // vez se leen como tres servicios a la carta.
          <li key={p.n} className="relative h-full">
          <AlAparecer retraso={i * 130} className="h-full">
          <div
            className="flex h-full flex-col rounded-3xl p-7"
            style={{ background: T.ink, border: `1px solid ${T.line}` }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-sm font-black tabular-nums"
                style={{ color: T.muted }}
              >
                {p.n}
              </span>
              {/* La flecha entre tarjetas, solo en pantalla ancha: es lo que
                  hace que se lean como una secuencia y no como tres servicios
                  sueltos. La última no la lleva. */}
              {i < pasos.length - 1 && (
                <span
                  aria-hidden
                  className="absolute -right-[1.15rem] top-1/2 hidden -translate-y-1/2 md:block"
                  style={{ color: T.line }}
                >
                  <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6">
                    <path
                      d="M4 12h14m-5-5 5 5-5 5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              )}
            </div>

            {/* La altura del dibujo sube con el ancho de la tarjeta y no al
                revés. Estaba fija en h-24: en una columna de tres a partir de
                768px la tarjeta se queda en unos 175px de contenido y el
                dibujo pedía 160, así que llegaba de borde a borde y pesaba más
                que el titular que va debajo. En móvil pasaba lo mismo por el
                otro lado — una tarjeta a todo el ancho con un dibujo enorme
                antes de haber leído nada. */}
            <div className="mt-6 flex h-16 items-center sm:h-20 lg:h-24">
              <Dibujo />
            </div>

            <p
              className="mt-6 font-black leading-tight text-balance"
              style={{ fontSize: "clamp(1.25rem, 1.8vw, 1.625rem)" }}
            >
              {p.t}
            </p>
            <p className="mt-2.5 text-base leading-relaxed" style={{ color: T.muted }}>
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
    <svg aria-hidden viewBox="0 0 120 72" className="h-full w-auto max-w-full" style={{ color: T.lime }}>
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

/** Un calendario con un día marcado: la cita escrita donde tiene que estar. */
function Agenda() {
  const celdas = [];
  for (let f = 0; f < 3; f++) {
    for (let c = 0; c < 5; c++) {
      const marcada = f === 1 && c === 3;
      celdas.push(
        <rect
          key={`${f}-${c}`}
          x={10 + c * 20}
          y={26 + f * 15}
          width="13"
          height="9"
          rx="2.5"
          fill={marcada ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.8"
          opacity={marcada ? 1 : 0.3}
        />,
      );
    }
  }
  return (
    <svg aria-hidden viewBox="0 0 120 84" className="h-full w-auto max-w-full" style={{ color: T.lime }}>
      <rect
        x="4"
        y="10"
        width="112"
        height="70"
        rx="8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        opacity="0.4"
      />
      <path
        d="M28 4v12M92 4v12"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.4"
      />
      {celdas}
    </svg>
  );
}

/** Barras que suben con la flecha del retorno por encima. */
function Rentabilidad() {
  return (
    <svg aria-hidden viewBox="0 0 120 76" className="h-full w-auto max-w-full" style={{ color: T.lime }}>
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
