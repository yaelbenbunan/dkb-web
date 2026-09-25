import { GROWTH, GROWTH_THEME as T } from "@/lib/growth-config";

/**
 * Los huecos de verdad, dentro de la página.
 *
 * **Antes había que salir a otra pestaña para ver si había hueco.** Ese salto se
 * paga entero: quien está decidido llega, ve una página de Google que no se
 * parece a lo que estaba leyendo, y una parte se cae ahí. Con el calendario
 * aquí, elegir hora es un gesto más de la misma página.
 *
 * **No compite con el formulario del hero, y por eso vive al final.** Son dos
 * puertas para dos personas distintas: el formulario es para quien prefiere que
 * le llamen —que son más— y esto para quien quiere zanjarlo él y ya. Puestas una
 * al lado de la otra, dos llamadas a la acción del mismo tamaño no suman, se
 * reparten; el botón de arriba baja hasta aquí en vez de abrir otra pestaña.
 *
 * **`loading="lazy"` no es un detalle.** Este iframe carga la aplicación de
 * calendario de Google entera, y sin esto la descargaría toda la gente que abre
 * la landing, incluida la que nunca llega al final. Cargándolo al acercarse, lo
 * paga solo quien lo va a usar.
 *
 * Si no hay calendario configurado, la sección no se renderiza: una landing sin
 * `demoEmbedUrl` no debe enseñar un hueco blanco donde iba una agenda.
 */
export function CalendarioReserva() {
  if (!GROWTH.demoEmbedUrl) return null;

  return (
    <section id="reservar" className="scroll-mt-8 py-16 md:py-24" style={{ background: T.bg }}>
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span
            className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold"
            style={{ background: `${T.accent}1f`, color: T.accentText }}
          >
            Sin esperar a que te llamemos
          </span>
          <h2
            className="mt-4 font-extrabold leading-[1.1] tracking-[-0.02em] text-balance"
            style={{ fontSize: "clamp(1.875rem, 3.6vw, 2.75rem)" }}
          >
            Agenda una reunión online
          </h2>
          <p className="mt-4 text-lg leading-relaxed" style={{ color: T.muted }}>
            Una videollamada corta para ver tus números, explicarte cómo trabajamos y decirte si
            encaja con tu negocio. Sin compromiso.
          </p>
        </div>

        {/* La tarjeta blanca es del propio Google y no se puede teñir desde
            fuera: se le da marco con borde y sombra para que se lea como parte
            de la página. */}
        <div
          className="mx-auto mt-10 max-w-4xl overflow-hidden rounded-2xl"
          style={{
            border: `1px solid ${T.line}`,
            boxShadow: "0 12px 32px -20px rgba(15,43,48,0.25)",
          }}
        >
          <iframe
            src={GROWTH.demoEmbedUrl}
            title="Agenda una reunión online con dinkbit"
            loading="lazy"
            // La altura la manda Google y no se puede medir desde aquí —es otro
            // origen—, así que se le da sitio de sobra: un scroll dentro del
            // iframe es de lo peor que hay en el móvil.
            className="block h-[46rem] w-full border-0 sm:h-[42rem]"
            style={{ background: "#fff" }}
          />
        </div>
      </div>
    </section>
  );
}
