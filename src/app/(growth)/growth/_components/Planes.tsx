import { GROWTH_THEME as T } from "@/lib/growth-config";

/**
 * Los dos packs, comparados línea a línea.
 *
 * **Sin descripciones.** Cada fila era un título y un renglón explicándolo, y
 * eso convertía una tabla —que se mira— en un texto —que se lee—. Aquí lo único
 * que se busca es que alguien vea en dos segundos qué se lleva por 199 y qué
 * más por 299; lo que necesite explicación se explica en la llamada.
 *
 * Las filas no son todas de sí o no. "Campañas" está en los dos y lo que cambia
 * es cuántos canales, así que ahí va el dato: dos checks dirían que son iguales,
 * que es lo contrario de lo que pasa.
 *
 * Y cada columna termina en su botón. La tabla es donde se decide, así que
 * obligar a subir a buscar el formulario después de haber decidido es perder
 * gente por el camino.
 */

const PLANES = [
  { id: "basico", nombre: "Básico", precio: "199 €", destacado: false },
  { id: "avanzado", nombre: "Avanzado", precio: "299 €", destacado: true },
] as const;

type Valor = true | false | string;

const INCLUYE: { t: string; basico: Valor; avanzado: Valor; apagado?: boolean }[] = [
  { t: "Página web", basico: true, avanzado: true },
  { t: "Campañas de publicidad", basico: "Google o Meta", avanzado: "Google y Meta" },
  { t: "Sistema de pacientes", basico: true, avanzado: true },
  { t: "Citas en tu agenda", basico: true, avanzado: true },
  { t: "Panel de rentabilidad", basico: true, avanzado: true },
  { t: "Confirmación de citas por WhatsApp", basico: false, avanzado: true },
  { t: "Revisión mensual contigo", basico: false, avanzado: true },
  // Va DENTRO de la tabla y no en la letra pequeña. Es la pregunta que hace
  // todo el mundo en la primera llamada, y descubrirla después de haber dicho
  // un precio es la forma más rápida de parecer que se escondía.
  { t: "Inversión en anuncios", basico: "No incluida", avanzado: "No incluida", apagado: true },
];

/**
 * Las condiciones, en un párrafo pequeño y seguido.
 *
 * Estaban en cuatro líneas con viñeta, y con esa forma pesaban lo mismo que la
 * tabla: cuatro promesas puestas en fila parecen cuatro cosas importantes que
 * hay que sopesar antes de decidir. Son lo contrario — son lo que se cuenta
 * para que nadie se lleve una sorpresa. En letra pequeña y de corrido están en
 * su sitio: quien las quiera, ahí están.
 */
const CONDICIONES =
  "La inversión en anuncios la pagas tú directamente a Google y a Meta, con tu tarjeta: " +
  "ese dinero no pasa por nuestras manos, y tampoco nos llevamos comisión de lo que " +
  "inviertes. El segundo canal pide una inversión mínima de 300 € al mes para que dé " +
  "tiempo a aprender. Sin permanencia y sin cuota de alta: pagas mes a mes y te vas " +
  "cuando quieras.";

export function Planes() {
  return (
    <div>
      {/* ── Tabla, de tableta para arriba ── */}
      <div className="hidden md:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr>
              <th className="w-[42%] pb-7 pr-6 align-bottom">
                <h3
                  className="font-black leading-[1.05] tracking-[-0.03em]"
                  style={{ fontSize: "clamp(1.75rem, 3vw, 2.75rem)" }}
                >
                  Nuestros packs
                </h3>
                <p className="mt-2 text-base font-normal" style={{ color: T.muted }}>
                  Los dos, sin permanencia
                </p>
              </th>
              {PLANES.map((plan) => (
                <th
                  key={plan.id}
                  className="px-6 pb-7 align-bottom"
                  style={plan.destacado ? { background: `${T.lime}0f` } : undefined}
                >
                  <Encabezado plan={plan} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {INCLUYE.map((fila) => (
              <tr key={fila.t} style={{ borderTop: `1px solid ${T.line}` }}>
                <td className="py-4 pr-6">
                  <p
                    className="font-bold leading-snug"
                    style={{
                      fontSize: "clamp(1.0625rem, 1.4vw, 1.25rem)",
                      color: fila.apagado ? T.muted : T.fg,
                    }}
                  >
                    {fila.t}
                  </p>
                </td>
                {PLANES.map((plan) => (
                  <td
                    key={plan.id}
                    className="px-6 py-4 align-middle"
                    style={plan.destacado ? { background: `${T.lime}0f` } : undefined}
                  >
                    <Celda
                      valor={plan.id === "basico" ? fila.basico : fila.avanzado}
                      apagado={fila.apagado}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: `1px solid ${T.line}` }}>
              <td />
              {PLANES.map((plan) => (
                <td
                  key={plan.id}
                  className="px-6 pb-7 pt-7 align-top"
                  style={plan.destacado ? { background: `${T.lime}0f` } : undefined}
                >
                  <Boton plan={plan} />
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── Tarjetas, en móvil. Una tabla de tres columnas en un teléfono se
             lee con lupa, y esta página la van a abrir muchos desde el móvil. ── */}
      <div className="md:hidden">
        <h3
          className="font-black leading-[1.05] tracking-[-0.03em]"
          style={{ fontSize: "clamp(1.75rem, 6vw, 2.5rem)" }}
        >
          Nuestros packs
        </h3>
        <p className="mt-2 text-base" style={{ color: T.muted }}>
          Los dos, sin permanencia
        </p>
      </div>

      <div className="mt-6 grid gap-5 md:hidden">
        {PLANES.map((plan) => (
          <div
            key={plan.id}
            className="rounded-3xl p-6"
            style={{
              background: plan.destacado ? `${T.lime}0f` : T.ink,
              border: `1px solid ${plan.destacado ? `${T.lime}66` : T.line}`,
            }}
          >
            <Encabezado plan={plan} />
            <ul className="mt-6 space-y-3">
              {INCLUYE.map((fila) => {
                const valor = plan.id === "basico" ? fila.basico : fila.avanzado;
                const dentro = valor !== false && !fila.apagado;
                return (
                  <li key={fila.t} className="flex items-center gap-3">
                    <Marca activo={dentro} />
                    <span
                      className="font-bold"
                      style={!dentro ? { color: T.muted } : undefined}
                    >
                      {fila.t}
                      {typeof valor === "string" && (
                        <span style={{ color: fila.apagado ? T.muted : T.lime }}> · {valor}</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-7">
              <Boton plan={plan} />
            </div>
          </div>
        ))}
      </div>

      <p
        className="mt-10 max-w-4xl text-sm leading-relaxed"
        style={{ color: T.muted, opacity: 0.75 }}
      >
        {CONDICIONES}
      </p>
    </div>
  );
}

function Encabezado({ plan }: { plan: (typeof PLANES)[number] }) {
  return (
    <div>
      <p className="flex items-center gap-3">
        <span
          className="text-sm font-black uppercase tracking-[0.2em]"
          style={{ color: plan.destacado ? T.lime : T.muted }}
        >
          {plan.nombre}
        </span>
        {plan.destacado && (
          <span
            className="rounded-full px-2.5 py-1 text-[0.7rem] font-black uppercase tracking-[0.12em]"
            style={{ background: T.lime, color: T.ink }}
          >
            El completo
          </span>
        )}
      </p>
      <p className="mt-3 flex items-baseline gap-2">
        <span
          className="font-black leading-none tabular-nums tracking-[-0.03em]"
          style={{
            fontSize: "clamp(2.75rem, 5vw, 4.25rem)",
            color: plan.destacado ? T.lime : T.fg,
          }}
        >
          {plan.precio}
        </span>
        <span className="text-base font-bold" style={{ color: T.muted }}>
          al mes
        </span>
      </p>
    </div>
  );
}

/** Lleva al formulario de arriba, que es el único sitio donde se deja el teléfono. */
function Boton({ plan }: { plan: (typeof PLANES)[number] }) {
  return (
    <a
      href="#empezar"
      className="inline-flex w-full items-center justify-center rounded-full px-6 py-3.5 text-base font-bold transition-transform hover:-translate-y-0.5"
      style={
        plan.destacado
          ? { background: T.lime, color: T.ink }
          : { background: "transparent", color: T.fg, border: `1px solid ${T.line}` }
      }
    >
      Me interesa este plan
    </a>
  );
}

/** Un sí, un no, o el dato cuando lo que cambia no es si entra sino cuánto. */
function Celda({ valor, apagado }: { valor: Valor; apagado?: boolean }) {
  if (typeof valor === "string") {
    return (
      <span
        className="font-bold"
        style={{ fontSize: "1.125rem", color: apagado ? T.muted : T.lime }}
      >
        {valor}
      </span>
    );
  }
  return <Marca activo={valor} />;
}

function Marca({ activo }: { activo: boolean }) {
  if (!activo) {
    // Una raya y no una cruz: la cruz se lee como error, y aquí no falla nada
    // — simplemente ese plan no lo lleva.
    return (
      <span
        aria-label="No incluido"
        className="inline-block h-[2px] w-5 shrink-0 rounded-full align-middle"
        style={{ background: T.line }}
      />
    );
  }
  return (
    <svg
      aria-label="Incluido"
      role="img"
      viewBox="0 0 24 24"
      className="h-7 w-7 shrink-0"
      style={{ color: T.lime }}
    >
      <path
        d="M4.5 12.5l5 5 10-11"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
