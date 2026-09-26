import { GROWTH_THEME as T } from "@/lib/growth-config";

/**
 * Los dos planes, en dos tarjetas de precio.
 *
 * Cada tarjeta lleva la lista entera, con lo que no incluye en gris y tachado,
 * para que la diferencia se vea sin comparar columnas: canales e informe
 * mensual.
 *
 * **Los dos se venden igual de bien.** Mismo botón y mismo peso; el avanzado
 * solo lleva el borde turquesa y la etiqueta. Un básico apagado al lado de un
 * avanzado encendido dice «el barato es el de segunda», y quien no puede pagar
 * 299 no sube de plan al verlo: se va.
 *
 * **Sin letra pequeña, porque el titular de la sección lo promete** (26-09-2026).
 * Había un párrafo de condiciones debajo, y al lado de «Dos planes, sin letra
 * pequeña» se contradecía. Todo lo que decía está ya a la vista: la inversión en
 * anuncios y la cuota de alta, dentro de cada tarjeta; el mínimo de 300 € para
 * dos canales, en la del avanzado; y el resto —sin comisión, sin permanencia—,
 * en la banda de abajo y en las preguntas frecuentes.
 */

const PLANES = [
  { id: "basico", nombre: "Básico", precio: "199 €", destacado: false, nota: null },
  {
    id: "avanzado",
    nombre: "Avanzado",
    precio: "299 €",
    destacado: true,
    // Lo único de la antigua letra pequeña que no estaba ya en la tarjeta o en
    // las preguntas: con menos de 300 € repartidos en dos canales, ninguno de
    // los dos tiene presupuesto para estar activo todos los días del mes.
    nota: "Recomendado con 300 € al mes o más de inversión en anuncios.",
  },
] as const;

type Valor = true | false | string;

type Fila = { t: string; basico: Valor; avanzado: Valor; apagado?: boolean };

/**
 * Lo que entra en cada plan.
 *
 * **Solo captación desde el 25 de septiembre de 2026.** La tabla llevaba
 * además sistema de pacientes, citas en tu agenda, panel de rentabilidad y
 * recordatorios, y todo eso sale: Growth es la landing, las campañas y el
 * análisis. Lo que distingue los planes son los canales —uno o dos— y el
 * informe mensual, que va solo en el avanzado.
 */
const FILAS: Fila[] = [
  { t: "Landing de captación", basico: true, avanzado: true },
  { t: "Campañas de publicidad", basico: "1 canal: Google o Meta", avanzado: "2 canales: Google y Meta" },
  { t: "Análisis y optimización de campañas", basico: true, avanzado: true },
  { t: "Informe mensual de resultados", basico: false, avanzado: true },
  { t: "Reunión mensual online", basico: false, avanzado: true },
  // Las dos van DENTRO de la tabla y no en la letra pequeña. Son las dos
  // preguntas que hace todo el mundo en la primera llamada, y descubrirlas
  // después de haber leído un precio es la forma más rápida de parecer que se
  // escondían — que es justo lo contrario de lo que este producto vende.
  { t: "Inversión en anuncios", basico: "No incluida", avanzado: "No incluida", apagado: true },
  // El importe se publica desde el 2026-08-28 (§3 del documento de producto).
  // Estuvo como "Según tu caso" mientras la cuota se calculaba sobre la
  // inversión prevista; ahora es una cifra por plan, y esconderla solo servía
  // para que el pago inicial apareciera en la llamada — que es exactamente la
  // peor secuencia posible: anunciar "desde 199 €" y sacar el desembolso justo
  // al cerrar mata la confianza en el momento de decidir. Escritos aquí, 150 €
  // se leen por lo que son al lado de la cuota: baratos.
  { t: "Cuota de alta (una sola vez)", basico: "150 €", avanzado: "200 €", apagado: true },
];

export function Planes() {
  return (
    <div>
      <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
        {PLANES.map((plan) => (
          <article
            key={plan.id}
            data-plan={plan.id}
            className="relative flex flex-col rounded-2xl p-7"
            style={{
              background: T.bg,
              border: plan.destacado ? `2px solid ${T.accent}` : `1px solid ${T.line}`,
              boxShadow: "0 1px 2px rgba(15,43,48,0.04), 0 12px 32px -20px rgba(15,43,48,0.25)",
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold">{plan.nombre}</h3>
              {plan.destacado && (
                <span
                  className="rounded-full px-3 py-1 text-xs font-bold"
                  style={{ background: T.accent, color: T.onAccent }}
                >
                  Más completo
                </span>
              )}
            </div>

            <p className="mt-4 flex items-baseline gap-1.5">
              <span
                className="font-extrabold tabular-nums tracking-[-0.03em]"
                style={{ fontSize: "clamp(2.75rem, 5vw, 3.5rem)", lineHeight: 1 }}
              >
                {plan.precio}
              </span>
              <span className="text-base font-medium" style={{ color: T.muted }}>
                / mes
              </span>
            </p>

            {plan.nota && (
              <p className="mt-3 text-sm font-medium" style={{ color: T.accentText }}>
                {plan.nota}
              </p>
            )}

            <ul className="mt-6 flex-1 space-y-3 border-t pt-6" style={{ borderColor: T.line }}>
              {FILAS.map((fila) => {
                const valor = plan.id === "basico" ? fila.basico : fila.avanzado;
                const incluido = valor !== false;
                return (
                  <li key={fila.t} className="flex items-start gap-3 text-[0.95rem] leading-snug">
                    {fila.apagado ? <Punto /> : <Marca activo={incluido} />}
                    <span
                      style={{
                        color: incluido && !fila.apagado ? T.fg : T.muted,
                        textDecoration: incluido ? undefined : "line-through",
                      }}
                    >
                      {fila.t}
                      {typeof valor === "string" && (
                        <strong className="font-semibold" style={{ color: T.fg }}>
                          {" "}
                          · {valor}
                        </strong>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>

            <a
              href="#empezar"
              className="mt-8 inline-flex w-full items-center justify-center rounded-lg px-6 py-3.5 text-base font-bold transition-opacity hover:opacity-90"
              style={{ background: T.accent, color: T.onAccent }}
            >
              Quiero el plan {plan.nombre.toLowerCase()}
            </a>
          </article>
        ))}
      </div>

    </div>
  );
}

/** Un sí o un no. El no es una cruz fina: aquí no falla nada, ese plan no lo lleva. */
function Marca({ activo }: { activo: boolean }) {
  return activo ? (
    <svg aria-label="Incluido" role="img" viewBox="0 0 20 20" className="mt-0.5 h-5 w-5 shrink-0">
      <circle cx="10" cy="10" r="10" fill={`${T.accent}33`} />
      <path
        d="M6 10.5 8.7 13 14 7.5"
        fill="none"
        stroke={T.accentText}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ) : (
    <svg aria-label="No incluido" role="img" viewBox="0 0 20 20" className="mt-0.5 h-5 w-5 shrink-0">
      <path d="M7 7l6 6M13 7l-6 6" stroke={T.muted} strokeOpacity={0.55} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Para las condiciones —inversión, cuota de alta—, que no son ni sí ni no. */
function Punto() {
  return (
    <span aria-hidden className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: T.muted }} />
    </span>
  );
}
