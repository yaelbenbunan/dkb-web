import { GROWTH_THEME as T } from "@/lib/growth-config";

/**
 * Las preguntas que salen siempre en la primera llamada, contestadas antes.
 *
 * **Va al final y no antes del precio.** Quien está leyendo esto ya ha visto la
 * tabla y ha decidido si le encaja; lo que le queda es la desconfianza, y la
 * desconfianza no se responde con más argumentos, se responde contestando la
 * pregunta incómoda con su nombre. Puestas antes, estas mismas respuestas
 * sembrarían dudas que el lector todavía no tenía.
 *
 * **Las cuatro primeras son de dinero y ninguna se esquiva.** "¿Cómo puede ser
 * tan barato?" es la que piensa todo el mundo y nadie dice en voz alta, y no
 * contestarla deja al lector con la única explicación que se le ocurre sola:
 * que hay truco. La inversión en anuncios y la cuota de alta ya están en la
 * tabla —a propósito— y se repiten aquí porque son las dos que más caro salen
 * descubiertas tarde: soltarlas en la llamada, después de haber anunciado
 * "desde 199 €", mata la confianza justo en el momento de cerrar.
 *
 * Hechas con `<details>` nativo: se abren sin una línea de JavaScript, el
 * teclado y el lector de pantalla las entienden de serie, y el buscador ve el
 * texto de las respuestas aunque estén cerradas.
 */

const PREGUNTAS: { p: string; r: string }[] = [
  {
    p: "¿Cómo puede costar tan poco?",
    r:
      "Porque el sistema ya está construido y es el mismo para todas las clínicas. La web, " +
      "el sistema de pacientes, la agenda y el panel no se hacen otra vez cada vez: lo que " +
      "se prepara para ti son tus textos, tus tratamientos y tus campañas. No estás pagando " +
      "que alguien te desarrolle un sistema, estás pagando por usarlo.",
  },
  {
    p: "¿La inversión en anuncios está incluida?",
    r:
      "No, y es la parte que conviene tener clara desde el principio. Lo que pagas a Google " +
      "y a Meta lo pagas tú directamente con tu tarjeta: ese dinero no pasa por nuestras " +
      "manos y no nos llevamos ninguna comisión de lo que inviertes. La cuota es por el " +
      "sistema y por el trabajo de llevarlo.",
  },
  {
    p: "¿Hay algún pago al empezar?",
    r:
      "Sí: una cuota de alta que se paga una sola vez. El trabajo del principio es real y " +
      "está concentrado —tu web, la configuración de las campañas y el alta en el " +
      "sistema— y por eso no va dentro de la cuota mensual. No es una cifra fija: depende " +
      "de cuánto vayas a invertir y de si llevas uno o dos canales, porque una clínica con " +
      "un canal y poco presupuesto no da el mismo trabajo de montaje que una con dos. Te " +
      "decimos el importe en la primera llamada, antes de que contrates nada.",
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
    p: "¿Tengo que cambiar el programa que uso en la clínica?",
    r:
      "No. Tu recepción sigue dando hora donde la da hoy. Si tu agenda está en Google " +
      "Calendar o en Outlook, la conectamos y las citas que vengan de campañas se escriben " +
      "en un calendario aparte dentro de tu propia cuenta, para que se vean junto a las " +
      "demás sin mezclarse. Y si tu agenda vive en Gesden, Clinic Cloud o cualquier otro " +
      "gestor, el sistema funciona igual: lo que medimos es de dónde viene cada paciente y " +
      "cuánto factura, no dónde está escrita la cita.",
  },
  {
    p: "¿Y si ya tengo web?",
    r:
      "La tuya se queda como está, no la tocamos. Montamos una página de captación en un " +
      "subdominio tuyo —del tipo citas.tuclinica.com— y ahí dirigimos todo el tráfico de " +
      "las campañas. Sale mejor así: a esa página solo llega gente de anuncios, y por eso " +
      "los números se pueden atribuir con precisión. Lo que sí hay que saber es que los " +
      "pacientes que entren por tu web de siempre no aparecerán en el sistema.",
  },
];

export function Faqs() {
  return (
    // Un tercio y dos tercios, en proporción y no en un ancho fijo. La columna
    // del título estaba topada en 22 rem, así que en un monitor ancho se
    // quedaba en la cuarta parte y el titular se partía en cuatro renglones
    // mientras al lado sobraba sitio. En fracciones, las dos crecen juntas.
    <div className="grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-16">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.24em]" style={{ color: T.lime }}>
          Preguntas frecuentes
        </p>
        <h2
          className="mt-8 font-black leading-[1.02] tracking-[-0.03em] text-balance"
          style={{ fontSize: "clamp(2.25rem, 4vw, 3.5rem)" }}
        >
          Lo que se pregunta
          <br />
          <span style={{ color: T.lime }}>en la primera llamada.</span>
        </h2>
        <p className="mt-6 text-base leading-relaxed" style={{ color: T.muted }}>
          Contestado aquí para que no haya que llamar para saberlo.
        </p>
      </div>

      <div>
        {PREGUNTAS.map((f) => (
          <details
            key={f.p}
            className="group border-t last:border-b"
            style={{ borderColor: T.line }}
          >
            <summary
              className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 font-bold leading-snug text-pretty transition-colors hover:opacity-80 [&::-webkit-details-marker]:hidden"
              style={{ fontSize: "clamp(1.125rem, 1.6vw, 1.375rem)" }}
            >
              {f.p}
              {/* Una cruz que se convierte en raya al abrir: dice "hay más" y
                  "ya está" con el mismo trazo, sin girar una flecha que a este
                  tamaño no se vería girar. */}
              <span
                aria-hidden
                className="relative block h-6 w-6 shrink-0"
                style={{ color: T.lime }}
              >
                <span
                  className="absolute left-1/2 top-1/2 block h-[2px] w-4 -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{ background: "currentColor" }}
                />
                <span
                  className="absolute left-1/2 top-1/2 block h-[2px] w-4 -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform duration-200 group-open:rotate-0 rotate-90"
                  style={{ background: "currentColor" }}
                />
              </span>
            </summary>
            {/* Sin tope de ancho: la columna ya es la que decide, y encima de
                ella un `max-w` solo servía para dejar un canal vacío a la
                derecha de cada respuesta. */}
            <p
              className="pb-7 pr-10 text-base leading-relaxed"
              style={{ color: T.muted }}
            >
              {f.r}
            </p>
          </details>
        ))}
      </div>
    </div>
  );
}
