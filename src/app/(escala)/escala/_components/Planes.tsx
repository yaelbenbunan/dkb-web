import { GROWTH_THEME as T } from "@/lib/growth-config";

/**
 * Los dos planes, comparados línea a línea.
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
 *
 * **El título ya no vive en la esquina de la tabla.** Estuvo ahí para no
 * separar la tabla de lo anterior, y el efecto fue el contrario: sin nada que
 * abriera la sección, los planes aparecían de golpe y no se leían como un
 * capítulo nuevo. Ahora la sección se presenta arriba —ver `page.tsx`— y la
 * esquina hace lo único que le corresponde: poner nombre a la columna de filas.
 *
 * **Cada columna va centrada.** Alineadas a la izquierda, el precio, el nombre
 * y los checks colgaban del borde de su celda y las dos columnas se leían como
 * un margen desordenado. Centradas, cada plan es un bloque con su eje, y el
 * precio —que es lo que se viene a mirar— cae justo en medio.
 *
 * **Los dos planes se venden igual de bien.** Se llegó a marcar mucho el
 * avanzado —columna teñida, precio en lima, botón de color solo en él— y era un
 * error de negocio: nos interesa que contraten, sea el que sea, y un básico
 * apagado al lado de un avanzado encendido dice "el barato es el de segunda".
 * Quien no se puede permitir 299 no sube de plan al ver eso: se va.
 *
 * Así que los dos llevan el mismo precio en lima, el mismo botón y el mismo
 * peso. Lo único que distingue al avanzado es una etiqueta discreta y un fondo
 * apenas teñido: suficiente para guiar, no tanto como para descartar el otro.
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

/**
 * Las condiciones, en un párrafo pequeño y seguido.
 *
 * Estaban en cuatro líneas con viñeta, y con esa forma pesaban lo mismo que la
 * tabla: cuatro promesas puestas en fila parecen cuatro cosas importantes que
 * hay que sopesar antes de decidir. Son lo contrario — son lo que se cuenta
 * para que nadie se lleve una sorpresa. En letra pequeña y de corrido están en
 * su sitio: quien las quiera, ahí están.
 *
 * **La cuota de alta se dice, y se dice con su importe.** Estuvo escrito "sin
 * cuota de alta", que contradecía §3 del documento de producto y —peor— era la
 * peor secuencia comercial posible: anunciar 199 € y sacar el pago inicial en
 * la llamada mata la confianza justo en el momento de cerrar, y la confianza es
 * el producto. Después estuvo como "según tu caso", que era verdad mientras se
 * calculaba sobre la inversión prevista y dejaba igualmente el desembolso para
 * la llamada. Desde el 2026-08-28 es una cifra por plan y va escrita.
 *
 * **El suelo de 300 € se explica por el calendario, no por el algoritmo.**
 * Decía "para que dé tiempo a aprender", que es cierto por dentro y no dice
 * nada por fuera: nadie que lleve una clínica sabe qué tiene que aprender un
 * anuncio. Lo que sí entiende cualquiera es que un presupuesto pequeño
 * repartido en dos plataformas no llega para tener las dos encendidas todos los
 * días del mes. Es la misma advertencia contada en unidades que se pueden
 * comprobar en un calendario.
 */
const CONDICIONES =
  "La inversión en anuncios la pagas tú directamente a Google y a Meta, con tu tarjeta: " +
  "ese dinero no pasa por nuestras manos, y tampoco nos llevamos comisión de lo que " +
  "inviertes. El segundo canal pide una inversión mínima de 300 € al mes: por debajo de " +
  "esa cifra, el presupuesto no da para mantener dos campañas activas todos los días del " +
  "mes. Sin permanencia: pagas mes a mes y te vas cuando quieras. Al empezar sí hay una " +
  "cuota de alta única de 150 € en el básico y 200 € en el avanzado: la web, la " +
  "configuración de las campañas y el alta en el sistema son trabajo real y concentrado, y " +
  "por eso no van dentro de la mensualidad.";

export function Planes() {
  return (
    <div>
      {/* ── Tabla, de tableta para arriba ── */}
      <div className="hidden md:block">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {/* **El título de la sección vive aquí, en la esquina.**
                  Estuvo fuera, encima de la tabla, y dejaba dos huecos a la vez:
                  una banda vacía a su derecha —el título ocupa un tercio del
                  ancho y la sección es toda la pantalla— y otra debajo, entre él
                  y la tabla. Dos agujeros para un texto de dos palabras.

                  Puesto en la casilla que la tabla necesita de todas formas para
                  alinear las columnas, los dos desaparecen de golpe: el título
                  ocupa el hueco que ya existía y queda a la misma altura que los
                  precios, que es justo con lo que se quiere que se lea junto. */}
              <th className="w-[38%] pb-7 pr-6 text-left align-bottom">
                <h2
                  className="font-black leading-[1.02] tracking-[-0.03em] text-balance"
                  style={{ fontSize: "clamp(2.25rem, 4.4vw, 4rem)" }}
                >
                  Nuestros planes
                </h2>
              </th>
              {PLANES.map((plan) => (
                <th
                  key={plan.id}
                  className="px-6 pb-7 text-center align-bottom"
                  style={plan.destacado ? { background: `${T.lime}08` } : undefined}
                >
                  <Encabezado plan={plan} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {INCLUYE.map((fila) => (
              <tr key={fila.t} style={{ borderTop: `1px solid ${T.line}` }}>
                <td className="py-4 pr-6 text-left">
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
                    className="px-6 py-4 text-center align-middle"
                    style={plan.destacado ? { background: `${T.lime}08` } : undefined}
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
                  style={plan.destacado ? { background: `${T.lime}08` } : undefined}
                >
                  <Boton />
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── Tarjetas, en móvil. Una tabla de tres columnas en un teléfono se
             lee con lupa, y esta página la van a abrir muchos desde el móvil.

             Aquí el título sí va encima: sin tabla no hay esquina donde
             meterlo, y una columna de tarjetas que empieza sin nombre no dice
             de qué sección forma parte. ── */}
      <h2
        className="font-black leading-[1.02] tracking-[-0.03em] text-balance md:hidden"
        style={{ fontSize: "clamp(2.25rem, 8vw, 3rem)" }}
      >
        Nuestros planes
      </h2>

      <div className="mt-7 grid gap-5 md:hidden">
        {PLANES.map((plan) => (
          <div
            key={plan.id}
            className="rounded-3xl p-6"
            style={{
              background: plan.destacado ? `${T.lime}08` : T.ink,
              border: `1px solid ${plan.destacado ? `${T.lime}33` : T.line}`,
            }}
          >
            <Encabezado plan={plan} />
            {/* La lista sí va a la izquierda aunque la cabecera esté centrada:
                ocho renglones centrados no se recorren con la vista, se leen
                uno a uno buscando dónde empieza cada cual. */}
            <ul className="mt-6 space-y-3 text-left">
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
              <Boton />
            </div>
          </div>
        ))}
      </div>

      {/* A todo el ancho y en letra pequeña: es la letra pequeña de verdad, la
          que se lee de corrido si a alguien le interesa. Encajonada en una
          columna estrecha volvía a parecer un bloque con importancia propia. */}
      <p className="mt-10 text-sm leading-relaxed" style={{ color: T.muted, opacity: 0.75 }}>
        {CONDICIONES}
      </p>
    </div>
  );
}

/**
 * Nombre, etiqueta y precio, centrados y en ese orden.
 *
 * **El precio va solo en su renglón y es lo más grande de la sección.** Estaba
 * en línea con "al mes" y compartía renglón con él, y esos dos elementos no
 * pesan lo mismo: el número es la respuesta a lo único que se ha venido a
 * preguntar aquí, y "al mes" es la unidad. Puesto debajo y en pequeño, la
 * unidad sigue estando —hace falta, si no el precio parece un pago único— pero
 * ya no le resta sitio a la cifra.
 */
function Encabezado({ plan }: { plan: (typeof PLANES)[number] }) {
  return (
    <div className="text-center">
      <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
        <span
          className="text-sm font-black uppercase tracking-[0.2em]"
          style={{ color: T.muted }}
        >
          {plan.nombre}
        </span>
        {plan.destacado && (
          <span
            className="rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold uppercase tracking-[0.12em]"
            style={{ color: T.lime, border: `1px solid ${T.lime}55` }}
          >
            Más completo
          </span>
        )}
      </p>
      <p
        className="mt-3 block font-black leading-[0.9] tabular-nums tracking-[-0.04em]"
        style={{ fontSize: "clamp(3.5rem, 6.4vw, 5.75rem)", color: T.lime }}
      >
        {plan.precio}
      </p>
      <p
        className="mt-2 text-sm font-bold uppercase tracking-[0.18em]"
        style={{ color: T.muted }}
      >
        al mes
      </p>
    </div>
  );
}

/**
 * Lleva al formulario de arriba, que es el único sitio donde se deja el
 * teléfono. Es idéntico en los dos planes: ya no depende de cuál sea.
 */
function Boton() {
  return (
    <a
      href="#empezar"
      className="inline-flex w-full items-center justify-center rounded-full px-6 py-3.5 text-base font-bold transition-transform hover:-translate-y-0.5"
      style={{ background: T.lime, color: T.ink }}
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
  // En bloque y centrado: el check es un SVG en línea y, suelto en una celda
  // centrada, se apoyaba en la línea base del texto que no hay.
  return (
    <span className="flex items-center justify-center">
      <Marca activo={valor} />
    </span>
  );
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
