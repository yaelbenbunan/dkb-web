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
    <section
      id="reservar"
      className="relative overflow-hidden py-16 md:py-20 lg:py-24"
      style={{ background: T.ink }}
    >
      <div className="mx-auto w-full max-w-[110rem] px-6 sm:px-10 lg:px-14">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.35fr] lg:items-start lg:gap-14">
          <div>
            <p
              className="text-sm font-bold uppercase tracking-[0.24em]"
              style={{ color: T.lime }}
            >
              Sin esperar a que te llamemos
            </p>
            {/* «Elige tú el hueco» describía el mecanismo —cómo se reserva— y no
                lo que se lleva quien reserva. Esto dice de qué va la reunión, que
                es lo que decide si alguien la pide o cierra la pestaña. */}
            <h2
              className="mt-8 font-black leading-[1.02] tracking-[-0.03em] text-balance"
              style={{ fontSize: "clamp(2.25rem, 4vw, 3.5rem)" }}
            >
              Agenda una
              <br />
              <span style={{ color: T.lime }}>reunión online.</span>
            </h2>
            <p className="mt-6 max-w-md text-base leading-relaxed" style={{ color: T.muted }}>
              Una videollamada corta para ver tus números, explicarte el sistema y decirte si
              encaja con tu negocio. Sin compromiso.
            </p>
          </div>

          {/* La tarjeta blanca es del propio Google y no se puede teñir desde
              fuera, así que en vez de disimularla se le da marco: fondo claro,
              esquinas redondeadas y el mismo halo lima que lleva el formulario
              del hero. Así se lee como una pieza de esta página y no como algo
              pegado. */}
          <div
            className="overflow-hidden rounded-3xl"
            style={{ boxShadow: `0 0 0 6px ${T.lime}22, 0 30px 60px -20px rgba(0,0,0,0.6)` }}
          >
            <iframe
              src={GROWTH.demoEmbedUrl}
              title="Agenda una reunión online con dinkbit"
              loading="lazy"
              // La altura la manda el contenido de Google y no se puede medir
              // desde aquí —es de otro origen—, así que se le da sitio de sobra:
              // un iframe corto obliga a hacer scroll DENTRO del iframe, y ese
              // scroll anidado es de las cosas que peor se manejan en el móvil.
              className="block h-[46rem] w-full border-0 sm:h-[42rem]"
              style={{ background: "#fff" }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
