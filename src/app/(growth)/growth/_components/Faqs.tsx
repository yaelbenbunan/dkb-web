import { GROWTH_THEME as T } from "@/lib/growth-config";
import { GENERAL, type SectorGrowth } from "@/lib/growth-sectores";

/**
 * Las preguntas que salen siempre en la primera llamada, contestadas antes.
 *
 * **Va al final y no antes del precio.** Quien está leyendo esto ya ha visto la
 * tabla y ha decidido si le encaja; lo que le queda es la desconfianza, y la
 * desconfianza no se responde con más argumentos, se responde contestando la
 * pregunta incómoda con su nombre. Puestas antes, estas mismas respuestas
 * sembrarían dudas que el lector todavía no tenía.
 *
 * **Las primeras son de dinero y ninguna se esquiva.** "¿Cómo puede ser
 * tan barato?" es la que piensa todo el mundo y nadie dice en voz alta, y no
 * contestarla deja al lector con la única explicación que se le ocurre sola:
 * que hay truco. La inversión en anuncios y la cuota de alta ya están en la
 * tabla —a propósito— y se repiten aquí porque son las dos que más caro salen
 * descubiertas tarde: soltarlas en la llamada, después de haber anunciado
 * "desde 199 €", mata la confianza justo en el momento de cerrar.
 *
 * **Comunes, pero dichas con las palabras de cada sector.** Estuvieron fijas y la
 * landing de psicología preguntaba por «el programa que uso en la clínica» y
 * contestaba con Gesden, que es un gestor dental. La respuesta es la misma para
 * todos; lo que no puede es delatar para quién se escribió.
 *
 * **Desde el 25 de septiembre de 2026 no hablan de sistema ni de agenda.** La
 * pregunta del programa de gestión salió entera —solo tenía sentido mientras
 * conectábamos la agenda de la clínica— y entró la de la diferencia entre
 * planes, que ahora es sencilla de contestar: canales e informe.
 *
 * Hechas con `<details>` nativo: se abren sin una línea de JavaScript, el
 * teclado y el lector de pantalla las entienden de serie, y el buscador ve el
 * texto de las respuestas aunque estén cerradas.
 */

const preguntasComunes = (s: SectorGrowth): { p: string; r: string }[] => [
  {
    p: "¿Cómo puede costar tan poco?",
    r:
      `Porque solo hacemos esto: captar ${s.termino.plural} con una landing y campañas en Google ` +
      `y Meta, y el método es el mismo para ${s.todos}. Lo que se prepara para ti son tus ` +
      "textos, tus tratamientos y tus anuncios. No estás pagando que alguien se invente un " +
      "proceso desde cero, estás pagando por uno que ya funciona.",
  },
  {
    p: "¿Qué diferencia hay entre los dos planes?",
    r:
      "Los canales y el informe. El básico lleva tus campañas en uno —Google o Meta, el que " +
      "mejor encaje con lo que ofreces— y el avanzado en los dos. Además, en el avanzado te " +
      "mandamos cada mes un informe con lo que ha pasado —cuántas solicitudes han llegado, de " +
      "qué campaña y a qué coste— y lo repasamos juntos en una reunión online. La landing y " +
      "la optimización de las campañas van en los dos.",
  },
  {
    // Decidido el 25 de septiembre de 2026: sin CRM, lo que sustituye al tablero
    // es el correo. Es lo primero que pregunta quien ya ha entendido el resto.
    p: `¿Cómo me llegan los ${s.termino.plural} interesados?`,
    r:
      "Por correo, a la dirección que nos indiques. Cada vez que alguien pide cita en tu " +
      "landing te llega un correo con su nombre, su teléfono y su email, para que le llames " +
      "tú. No tienes que instalar nada ni entrar en ningún programa.",
  },
  {
    p: "¿La inversión en anuncios está incluida?",
    r:
      "No, y es la parte que conviene tener clara desde el principio. Lo que pagas a Google " +
      "y a Meta lo pagas tú directamente con tu tarjeta: ese dinero no pasa por nuestras " +
      "manos y no nos llevamos ninguna comisión de lo que inviertes. La cuota es por el " +
      "trabajo: tu landing y llevar tus campañas.",
  },
  {
    p: "¿Hay algún pago al empezar?",
    r:
      "Sí: una cuota de alta que se paga una sola vez, 150 € en el plan básico y 200 € en " +
      "el avanzado. El trabajo del principio es real y está concentrado —tu landing y la " +
      "configuración de las campañas— y por eso no va dentro de la cuota mensual. Ese es el " +
      "importe y no hay otro: lo tienes escrito aquí para que no aparezca por sorpresa en la " +
      "llamada.",
  },
  {
    p: "¿Cuánto tengo que invertir en anuncios?",
    r:
      "Con un solo canal, lo que puedas asumir cada mes. Con dos, el suelo son 300 € al " +
      "mes: por debajo de esa cifra el presupuesto no da para mantener las dos campañas " +
      "activas todos los días del mes, y repartido sale peor que concentrado en una sola " +
      "plataforma. Si tu presupuesto no llega ahí, te lo decimos y contratas el básico.",
  },
  {
    p: "¿Qué pasa si quiero cancelar?",
    r:
      "No hay permanencia: avisas y el mes siguiente ya no se cobra. Antes de empezar te " +
      "dejamos por escrito qué te llevas si te vas —tus contenidos, tus fotos y tu dominio " +
      "apuntando a donde tú quieras—, porque eso es justo lo que no se debe descubrir el " +
      "día de la baja.",
  },
  {
    p: "¿Y si ya tengo web?",
    r:
      "La tuya se queda como está: no la tocamos ni la sustituimos. Montamos aparte una " +
      "landing de captación, alojada por nosotros, y ahí dirigimos todo el tráfico de las " +
      "campañas. Está lista en días y no hay que tocar nada de lo que ya tienes. Sale " +
      "mejor así: a esa página solo llega gente de anuncios, y por eso se sabe con precisión " +
      `qué campaña trae a cada ${s.termino.singular}. Si más adelante quieres que la landing ` +
      "vaya en un dominio tuyo, se cambia cuando digas.",
  },
];

/**
 * @param sector Sus preguntas propias van DELANTE de las comunes. Delante y no detrás: quien entra por una landing de sector llega
 *   con la duda de su gremio —si se puede anunciar terapia, si sirve trabajando
 *   con mutuas—, y enterrada bajo siete preguntas de dinero no la encuentra.
 */
export function Faqs({ sector = GENERAL }: { sector?: SectorGrowth } = {}) {
  const preguntas = [...sector.preguntas, ...preguntasComunes(sector)];
  return (
    // Centradas y en tarjetas.
    <div className="mx-auto max-w-3xl">
      <div className="text-center">
        <span
          className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold"
          style={{ background: `${T.accent}1f`, color: T.accentText }}
        >
          Preguntas frecuentes
        </span>
        <h2
          className="mt-4 font-extrabold leading-[1.1] tracking-[-0.02em] text-balance"
          style={{ fontSize: "clamp(1.875rem, 3.6vw, 2.75rem)" }}
        >
          Lo que nos preguntan antes de empezar
        </h2>
        <p className="mt-4 text-lg leading-relaxed" style={{ color: T.muted }}>
          Contestado aquí para que no haya que llamar para saberlo.
        </p>
      </div>

      <div className="mt-10 space-y-3">
        {preguntas.map((f) => (
          <details
            key={f.p}
            className="group rounded-xl"
            style={{ background: T.bg, border: `1px solid ${T.line}` }}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-5 px-5 py-4 text-[1.05rem] font-semibold leading-snug [&::-webkit-details-marker]:hidden">
              {f.p}
              {/* Una flecha que gira al abrir. */}
              <span
                aria-hidden
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-open:rotate-180"
                style={{ background: T.soft, color: T.accentText }}
              >
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5">
                  <path
                    d="M4 6l4 4 4-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </summary>
            <p className="px-5 pb-5 text-base leading-relaxed" style={{ color: T.muted }}>
              {f.r}
            </p>
          </details>
        ))}
      </div>
    </div>
  );
}
