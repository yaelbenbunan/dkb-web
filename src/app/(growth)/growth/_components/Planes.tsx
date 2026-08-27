import { GROWTH_THEME as T } from "@/lib/growth-config";

/**
 * Los dos planes, comparados fila a fila.
 *
 * Antes era un precio gigante con una frase debajo diciendo que por 100 € más
 * había otras dos cosas. Se leía como una nota al pie, y lo que decide una
 * compra de este tipo es justo lo contrario: ver **qué entra y qué no** de un
 * vistazo, sin tener que reconstruirlo leyendo un párrafo.
 *
 * Las filas no son todas de sí o no. "Campañas" está en los dos planes y lo que
 * cambia es cuántos canales, así que ahí va el dato en vez de un check: un check
 * en las dos columnas diría que son iguales, que es exactamente lo contrario de
 * lo que pasa.
 *
 * En pantalla ancha va como tabla y en móvil como dos tarjetas, con los mismos
 * datos. Una tabla de tres columnas en un móvil se lee con lupa, y esta pantalla
 * la va a abrir mucha gente desde el teléfono.
 */

const PLANES = [
  { id: "basico", nombre: "Básico", precio: "199 €", destacado: false },
  { id: "avanzado", nombre: "Avanzado", precio: "299 €", destacado: true },
] as const;

type Valor = true | false | string;

const INCLUYE: {
  t: string;
  d: string;
  basico: Valor;
  avanzado: Valor;
  /** El texto de esa fila informa, no promete: se pinta apagado y no en lima. */
  apagado?: boolean;
}[] = [
  {
    t: "Tu web de captación",
    d: "La hacemos, la publicamos y la mantenemos nosotros",
    basico: true,
    avanzado: true,
  },
  {
    // Justifica precio y además funciona: quien busca "implante dental" y
    // aterriza en una página de implantes convierte bastante mejor que quien
    // cae en la portada y tiene que buscarse la vida.
    t: "Páginas por tratamiento",
    d: "Una página propia para implantes, ortodoncia o lo que anunciemos, en vez de mandar a todo el mundo a la portada",
    basico: false,
    avanzado: true,
  },
  {
    t: "Campañas de publicidad",
    d: "Estrategia, anuncios y ajustes cada mes",
    basico: "Google o Meta",
    avanzado: "Google y Meta",
  },
  {
    t: "Sistema de pacientes",
    d: "Cada persona que deja su teléfono, con su ficha y de dónde vino",
    basico: true,
    avanzado: true,
  },
  {
    t: "Citas en tu agenda",
    d: "Se escriben en el calendario de la clínica sin apuntarlas dos veces",
    basico: true,
    avanzado: true,
  },
  {
    // El sistema ya guarda qué tratamiento se hizo en cada cita, así que esto
    // no es una promesa nueva: es enseñar un dato que ya está dentro.
    t: "Panel de rentabilidad",
    d: "Quién acudió, cuánto facturó y qué te renta de verdad",
    basico: "Por campaña",
    avanzado: "Por campaña y tratamiento",
  },
  {
    t: "Confirmación por WhatsApp",
    d: "El paciente recibe el recordatorio y confirma; tú lo ves en su ficha",
    basico: false,
    avanzado: true,
  },
  {
    t: "Revisión mensual contigo",
    d: "Una llamada al mes para mirar los números juntos y decidir qué se toca",
    basico: false,
    avanzado: true,
  },
  {
    // Va DENTRO de la tabla y no en la letra pequeña. Es la pregunta que hace
    // todo el mundo en la primera llamada, y descubrirla después de haber
    // dicho un precio es la forma más rápida de parecer que se escondía.
    t: "Inversión en anuncios",
    d: "Lo que se gasta en Google y en Meta. Lo pagas tú directamente, con tu tarjeta",
    basico: "No incluida",
    avanzado: "No incluida",
    apagado: true,
  },
];

export function Planes() {
  return (
    <div>
      {/* ── Tabla, de tableta para arriba ── */}
      <div className="hidden md:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr>
              <th className="w-[46%] pb-6 align-bottom">
                <span className="sr-only">Qué incluye</span>
              </th>
              {PLANES.map((plan) => (
                <th key={plan.id} className="pb-6 pl-6 align-bottom">
                  <Encabezado plan={plan} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {INCLUYE.map((fila) => (
              <tr key={fila.t} style={{ borderTop: `1px solid ${T.line}` }}>
                <td className="py-5 pr-6">
                  <p className="text-lg font-bold">{fila.t}</p>
                  <p className="mt-1 text-base leading-snug" style={{ color: T.muted }}>
                    {fila.d}
                  </p>
                </td>
                {PLANES.map((plan) => (
                  <td
                    key={plan.id}
                    className="py-5 pl-6 align-middle"
                    style={
                      plan.destacado
                        ? { background: `${T.lime}0d` }
                        : undefined
                    }
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
        </table>
      </div>

      {/* ── Tarjetas, en móvil ── */}
      <div className="grid gap-5 md:hidden">
        {PLANES.map((plan) => (
          <div
            key={plan.id}
            className="rounded-3xl p-6"
            style={{
              background: T.ink,
              border: `1px solid ${plan.destacado ? `${T.lime}66` : T.line}`,
            }}
          >
            <Encabezado plan={plan} />
            <ul className="mt-6 space-y-4">
              {INCLUYE.map((fila) => {
                const valor = plan.id === "basico" ? fila.basico : fila.avanzado;
                return (
                  <li key={fila.t} className="flex gap-3">
                    <span className="mt-0.5 shrink-0">
                      <Marca activo={valor !== false && !fila.apagado} />
                    </span>
                    <span>
                      <span
                        className="font-bold"
                        style={valor === false || fila.apagado ? { color: T.muted } : undefined}
                      >
                        {fila.t}
                      </span>
                      {typeof valor === "string" && (
                        <span
                          className="font-bold"
                          style={{ color: fila.apagado ? T.muted : T.lime }}
                        >
                          {" "}
                          · {valor}
                        </span>
                      )}
                      <span className="block text-sm leading-snug" style={{ color: T.muted }}>
                        {fila.d}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Las tres cosas que responden a la desconfianza que deja cualquier
          tarifa. Estaban en tres columnas debajo, repitiendo media tabla; aquí
          se leen del tirón y en el sitio donde surge la duda. */}
      <div className="mt-10 space-y-3">
        {[
          "La inversión en anuncios NO está incluida en ninguno de los dos packs: la pagas tú directamente a Google y a Meta, con tu tarjeta. Ese dinero no pasa por nuestras manos.",
          "Tampoco nos llevamos comisión de lo que inviertes. La cuota es la cuota, gastes 300 € o 3.000 €.",
          "El segundo canal pide una inversión mínima de 300 € al mes para que dé tiempo a aprender.",
          "Sin permanencia y sin cuota de alta: pagas mes a mes y te vas cuando quieras.",
        ].map((linea) => (
          <p key={linea} className="flex gap-3 text-base leading-relaxed" style={{ color: T.muted }}>
            <span aria-hidden className="mt-[0.55em] h-[2px] w-4 shrink-0" style={{ background: T.line }} />
            <span>{linea}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

function Encabezado({ plan }: { plan: (typeof PLANES)[number] }) {
  return (
    <div>
      <p
        className="text-sm font-bold uppercase tracking-[0.2em]"
        style={{ color: plan.destacado ? T.lime : T.muted }}
      >
        {plan.nombre}
      </p>
      <p className="mt-2 flex items-baseline gap-2">
        <span
          className="font-black leading-none tabular-nums tracking-[-0.03em]"
          style={{
            fontSize: "clamp(2.5rem, 5vw, 4rem)",
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

/** Un sí, un no, o el dato cuando lo que cambia no es si entra sino cuánto. */
function Celda({ valor, apagado }: { valor: Valor; apagado?: boolean }) {
  if (typeof valor === "string") {
    return (
      <span className="text-lg font-bold" style={{ color: apagado ? T.muted : T.lime }}>
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
        className="inline-block h-[2px] w-5 rounded-full align-middle"
        style={{ background: T.line }}
      />
    );
  }
  return (
    <svg
      aria-label="Incluido"
      role="img"
      viewBox="0 0 24 24"
      className="h-6 w-6"
      style={{ color: T.lime }}
    >
      <path
        d="M4.5 12.5l5 5 10-11"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
